import {
  EdgeFields,
  InstanceFields,
  isEdgeHealthy,
  isInstanceOnEdge,
  LEGACY_EDGE_ID,
  Logger,
  PH_EDGE_ID,
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

const IDEMPOTENT = new Set(['GET', 'HEAD', 'OPTIONS'])

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

type RoutedRequest = Request & { phEdgeId?: string; phEdgeTarget?: string; phNext?: (err?: unknown) => void }

export const createEdgeRoutingMiddleware = (mirror: EdgeRoutingMirror, logger: Logger): RequestHandler => {
  const { dbg, info, error } = logger.create(`firewall:edge-routing`)
  const myEdgeId = PH_EDGE_ID()
  const agent = new http.Agent({ keepAlive: true, maxSockets: 512 })
  /** Edges with a recent connection failure: requests wait for a health check before being proxied. */
  const suspect = new Set<string>()

  /** Wait until the owner answers its health check. False once it has been silent past the healthy window. */
  const holdFor = async (edgeId: string, req: Request, res: Response) => {
    const retryMs = Math.max(250, PH_FIREWALL_DAEMON_GRACE_RETRY_MS())
    let logged = false
    for (;;) {
      // `req.destroyed` is already true once a GET's empty body is read; watch the client connection instead.
      if (res.writableEnded || res.destroyed || req.socket?.destroyed) return false
      const owner = mirror.getEdge(edgeId)
      if (!owner || !isEdgeHealthy(owner, Date.now())) return false
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
    if (decision.kind === 'local') return next()
    if (decision.kind === 'unavailable') {
      dbg(`${req.hostname}: ${decision.reason}`)
      return sendEdgeUnavailable(res)
    }
    const { edge } = decision
    if (suspect.has(edge.id) && !(await holdFor(edge.id, req, res))) return sendEdgeUnavailable(res)
    const r = req as RoutedRequest
    r.phEdgeId = edge.id
    r.phEdgeTarget = mirror.getEdge(edge.id)?.internal_url ?? edge.internal_url
    r.phNext = next
    dbg(`${req.method} ${req.hostname}${req.originalUrl} -> edge ${edge.edge_id} (${r.phEdgeTarget})`)
    return proxy(r, res, next)
  }
}
