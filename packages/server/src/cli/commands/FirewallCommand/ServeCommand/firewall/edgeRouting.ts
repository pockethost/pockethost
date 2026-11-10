import {
  EdgeFields,
  InstanceFields,
  isEdgeHealthy,
  isInstanceOnEdge,
  LEGACY_EDGE_ID,
  Logger,
  PH_EDGE_ID,
  PH_EDGE_REGION,
  PH_FIREWALL_DAEMON_GRACE_RETRY_MS,
} from '@'
import type { Request, RequestHandler, Response } from 'express'
import http from 'http'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { isDaemonUnreachableError } from './daemonGrace'
import { rewriteProxiedCorsHeaders } from './instanceCors'
import { isHealthProbePath } from './rateLimiterPure'

/**
 * Any edge accepts any request. Each instance runs on exactly one edge (`instances.edge`); a request for an instance on
 * another edge is proxied over the private network straight to that edge's daemon. Edge addresses and health come from
 * the mothership mirror, so edges joining or leaving are known to every firewall within a heartbeat.
 *
 * While the owner reported healthy within 30 s, a request it can't take right now is held and retried (like the local
 * daemon grace). Once it has been silent longer, or announced a clean shutdown, requests fail fast with a 503.
 */

export type EdgeRoutingMirror = {
  getInstanceByHost(host: string): Promise<InstanceFields | undefined>
  getEdge(id: string): EdgeFields | undefined
  getEdgeByEdgeId(edgeId: string): EdgeFields | undefined
}

export type RouteDecision =
  | { kind: 'local' }
  | { kind: 'remote'; edge: EdgeFields }
  | { kind: 'unavailable'; reason: string; edgeId?: string }

/** Pure: where a request for `instance` goes from the edge `myEdgeId`. */
export const decideRoute = (
  instance: Pick<InstanceFields, 'edge'> | undefined,
  mirror: Pick<EdgeRoutingMirror, 'getEdge' | 'getEdgeByEdgeId'>,
  myEdgeId: string,
  nowMs: number
): RouteDecision => {
  // Unknown hosts go to the local daemon, which answers 404 as before.
  if (!instance) return { kind: 'local' }
  const myEdge = mirror.getEdgeByEdgeId(myEdgeId)
  if (isInstanceOnEdge(instance, myEdge, myEdgeId)) return { kind: 'local' }
  const owner = instance.edge ? mirror.getEdge(instance.edge) : mirror.getEdgeByEdgeId(LEGACY_EDGE_ID)
  if (!owner) return { kind: 'unavailable', reason: `unknown edge ${instance.edge || LEGACY_EDGE_ID}` }
  if (!owner.internal_url)
    return { kind: 'unavailable', reason: `edge ${owner.edge_id} has no internal_url`, edgeId: owner.id }
  if (!isEdgeHealthy(owner, nowMs))
    return { kind: 'unavailable', reason: `edge ${owner.edge_id} is down`, edgeId: owner.id }
  return { kind: 'remote', edge: owner }
}

/** Response headers showing which edge a request entered at and which edge it resolved to. */
export const EDGE_HEADERS = {
  edgeName: 'X-PocketHost-Edge-Name',
  edgeRegion: 'X-PocketHost-Edge-Region',
  originName: 'X-PocketHost-Origin-Name',
  originRegion: 'X-PocketHost-Origin-Region',
} as const

type EdgeLabel = { name: string; region: string }

/** Pure: the four routing headers. `origin` is omitted when the owner edge is unknown. */
export const edgeHeaders = (entry: EdgeLabel, origin: EdgeLabel | undefined): Record<string, string> => ({
  [EDGE_HEADERS.edgeName]: entry.name,
  [EDGE_HEADERS.edgeRegion]: entry.region,
  ...(origin ? { [EDGE_HEADERS.originName]: origin.name, [EDGE_HEADERS.originRegion]: origin.region } : {}),
})

const IDEMPOTENT = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * An unreachable edge often drops packets instead of refusing, so a connect would hang for minutes. Give up on the
 * connect (only the connect: long responses such as realtime streams are not limited) and let the hold logic retry.
 */
const CONNECT_TIMEOUT_MS = 3000

const sendEdgeUnavailable = (res: Response) => {
  if (res.headersSent || res.writableEnded) return
  res.set('Retry-After', '10')
  res.status(503).send('This PocketHost instance is temporarily unavailable. Please retry shortly.')
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const isEdgeReachable = async (internalUrl: string, timeoutMs: number) => {
  try {
    const res = await fetch(`${internalUrl.replace(/\/+$/, '')}/_api/daemon/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return false
    return ((await res.json()) as { status?: string }).status === 'ok'
  } catch {
    return false
  }
}

/** How long a direct health probe of an edge may take (a fresh connection across regions costs ~2 RTT). */
export const STALE_EDGE_PROBE_TIMEOUT_MS = 2000
/** How long a probe result is reused, so a mirror hiccup costs one probe per edge, not one per request. */
export const STALE_EDGE_PROBE_TTL_MS = 5000

/**
 * The mirror's heartbeat timestamp can lag (a burst of late realtime events, a slow mothership), which would make a
 * live edge look down. Before failing fast on an edge the mirror calls silent, ask the edge itself. Results are cached
 * per edge for `ttlMs`, and concurrent callers share one in-flight probe.
 */
export const createStaleEdgeProbe = (
  probe: (internalUrl: string) => Promise<boolean>,
  ttlMs = STALE_EDGE_PROBE_TTL_MS,
  now: () => number = Date.now
) => {
  const cache = new Map<string, { at: number; result: Promise<boolean> }>()
  return (edge: Pick<EdgeFields, 'id' | 'internal_url'>): Promise<boolean> => {
    if (!edge.internal_url) return Promise.resolve(false)
    const hit = cache.get(edge.id)
    if (hit && now() - hit.at < ttlMs) return hit.result
    const result = probe(edge.internal_url).catch(() => false)
    cache.set(edge.id, { at: now(), result })
    return result
  }
}

type RoutedRequest = Request & { phEdgeId?: string; phEdgeTarget?: string; phNext?: (err?: unknown) => void }

export const createEdgeRoutingMiddleware = (mirror: EdgeRoutingMirror, logger: Logger): RequestHandler => {
  const { dbg, info, error } = logger.create(`firewall:edge-routing`)
  const myEdgeId = PH_EDGE_ID()
  const me: EdgeLabel = { name: myEdgeId, region: PH_EDGE_REGION() }
  const label = (edge: EdgeFields | undefined): EdgeLabel | undefined =>
    edge && { name: edge.edge_id, region: edge.region || '' }
  const agent = new http.Agent({ keepAlive: true, maxSockets: 512 })
  /** Edges with a recent connection failure: requests wait for a health check before being proxied. */
  const suspect = new Set<string>()
  const isSilentEdgeAlive = createStaleEdgeProbe((url) => isEdgeReachable(url, STALE_EDGE_PROBE_TIMEOUT_MS))
  /** Healthy per the mirror, or silent in the mirror but answering its own health check. */
  const isOwnerAlive = async (owner: EdgeFields) => {
    if (isEdgeHealthy(owner, Date.now())) return true
    if (owner.status === 'offline') return false
    const alive = await isSilentEdgeAlive(owner)
    if (alive) dbg(`Edge ${owner.edge_id} is stale in the mirror but answers its health check`)
    return alive
  }

  /** Wait until the owner answers its health check. False once it has been silent past the healthy window. */
  const holdFor = async (edgeId: string, req: Request, res: Response) => {
    const retryMs = Math.max(250, PH_FIREWALL_DAEMON_GRACE_RETRY_MS())
    let logged = false
    for (;;) {
      // `req.destroyed` is already true once a GET's empty body is read; watch the client connection instead.
      if (res.writableEnded || res.destroyed || req.socket?.destroyed) return false
      const owner = mirror.getEdge(edgeId)
      if (!owner || !(await isOwnerAlive(owner))) return false
      if (await isEdgeReachable(owner.internal_url, retryMs)) {
        suspect.delete(edgeId)
        return true
      }
      if (!logged) {
        info(`Edge ${owner.edge_id} unreachable; holding requests while it is within its healthy window`)
        logged = true
      }
      await sleep(retryMs)
    }
  }

  const proxy = createProxyMiddleware<Request, Response>({
    router: (req) => (req as RoutedRequest).phEdgeTarget!,
    agent,
    xfwd: true,
    proxyTimeout: 0,
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.setHeader('x-ph-forwarded-by', myEdgeId)
        proxyReq.once('socket', (socket) => {
          if (!socket.connecting) return
          const timer = setTimeout(() => {
            const err = Object.assign(new Error(`connect ETIMEDOUT after ${CONNECT_TIMEOUT_MS}ms`), {
              code: 'ETIMEDOUT',
            })
            proxyReq.destroy(err)
          }, CONNECT_TIMEOUT_MS)
          socket.once('connect', () => clearTimeout(timer))
          socket.once('close', () => clearTimeout(timer))
        })
      },
      proxyRes: (proxyRes, _req, res) => {
        rewriteProxiedCorsHeaders(proxyRes, res)
      },
      error: (err, req, res) => {
        const r = req as RoutedRequest
        const response = res as Response
        if (!('status' in response) || response.headersSent) return
        if (!r.phEdgeId || !isDaemonUnreachableError(err)) {
          error(`Edge proxy error`, { err: `${err}` })
          response.status(502).send(`Bad gateway`)
          return
        }
        suspect.add(r.phEdgeId)
        // A request with a body may already be partly sent; only replay ones without.
        if (!IDEMPOTENT.has(r.method)) {
          sendEdgeUnavailable(response)
          return
        }
        void holdFor(r.phEdgeId, r, response).then((ok) => {
          if (!ok) return sendEdgeUnavailable(response)
          const owner = mirror.getEdge(r.phEdgeId!)
          r.phEdgeTarget = owner?.internal_url
          proxy(r, response, r.phNext ?? (() => undefined))
        })
      },
    },
  })

  return async (req, res, next) => {
    if (isHealthProbePath(req.path)) return next()
    const instance = await mirror.getInstanceByHost(req.hostname)
    const decision = decideRoute(instance, mirror, myEdgeId, Date.now())
    const origin =
      decision.kind === 'local'
        ? me
        : decision.kind === 'remote'
          ? label(decision.edge)
          : label(decision.edgeId ? mirror.getEdge(decision.edgeId) : undefined)
    res.set(edgeHeaders(me, origin))
    if (decision.kind === 'local') return next()
    let edge: EdgeFields
    if (decision.kind === 'unavailable') {
      // The mirror may only be behind: if the owner answers directly, route to it anyway.
      const owner = decision.edgeId ? mirror.getEdge(decision.edgeId) : undefined
      if (!owner?.internal_url || !(await isOwnerAlive(owner))) {
        dbg(`${req.hostname}: ${decision.reason}`)
        return sendEdgeUnavailable(res)
      }
      edge = owner
    } else {
      edge = decision.edge
    }
    if (suspect.has(edge.id) && !(await holdFor(edge.id, req, res))) return sendEdgeUnavailable(res)
    const r = req as RoutedRequest
    r.phEdgeId = edge.id
    r.phEdgeTarget = mirror.getEdge(edge.id)?.internal_url ?? edge.internal_url
    r.phNext = next
    dbg(`${req.method} ${req.hostname}${req.originalUrl} -> edge ${edge.edge_id} (${r.phEdgeTarget})`)
    return proxy(r, res, next)
  }
}
