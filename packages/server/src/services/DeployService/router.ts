import type { LegacyInstanceFields } from '@'
import express, { type NextFunction, type Request, type Response } from 'express'
import { randomBytes } from 'node:crypto'
import type { InstanceFields, Logger } from '../../common'
import { instanceAllowedByScope } from '../InstanceFileAccess/scope'
import { fileAccessSuspension } from '../InstanceFileAccess/suspension'
import { DeployAuthError, type DeployAuth } from './auth'
import { BundleError, decodeBundle } from './bundle'
import { ManifestError, validateManifest, type Manifest } from './codeSet'
import { DeployConflictError, MissingBlobsError, type DeployOptions, type DeployStore } from './deployStore'
import { createFilesRouter, FileApiError } from './filesRouter'

export const DEPLOY_API_PREFIX = '/_ph/deploy/v1'
/** Compressed upload limit per request. Cloudflare caps bodies at 100 MB. */
export const MAX_BUNDLE_BYTES = 64 * 1024 * 1024
export const MAX_BUNDLE_RAW_BYTES = 256 * 1024 * 1024

export type DeployRouterDeps = {
  resolveAuth: (authorization: string | undefined, ip?: string, opts?: { fresh?: boolean }) => Promise<DeployAuth>
  getInstanceByHost: (host: string) => Promise<InstanceFields | undefined>
  getUser: (id: string) => Promise<{ suspension?: string | null } | undefined>
  storeFor: (instance: InstanceFields) => DeployStore
  /** Stops the instance (if running), runs `fn`, and blocks new requests to it until `fn` settles. */
  withInstanceStopped: <T>(
    instance: InstanceFields,
    fn: () => Promise<T>
  ) => Promise<{ result: T; wasRunning: boolean }>
  startInstance: (instance: InstanceFields) => Promise<void>
  /** Replays the last `linesBack` log entries, then follows new ones. Returns an unsubscribe function. */
  tailLogs?: (instance: InstanceFields, linesBack: number, onEntry: (entry: unknown) => void) => () => void
  logger: Logger
}

export class DeployHttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra: Record<string, unknown> = {}
  ) {
    super(message)
  }
}

/** Names a deploy's manifest in the upload cache. Deploys are not recorded anywhere else. */
const newDeployId = () => `${Date.now()}-${randomBytes(4).toString('hex')}`

/** `nodeModules: true` means the client manages the root node_modules, even when it ships no packages. */
const deployOptions = (body: any): DeployOptions => ({ nodeModules: body?.nodeModules === true })

/** The edge sits behind Cloudflare and the firewall proxy, so `req.ip` is loopback. */
const clientIp = (req: Request) =>
  `${req.headers['cf-connecting-ip'] ?? `${req.headers['x-forwarded-for'] ?? ''}`.split(',')[0] ?? ''}`.trim() || req.ip

const hostOf = (req: Request) => `${req.headers.host ?? ''}`.toLowerCase().replace(/:\d+$/, '')

/** Serializes commits per instance. */
const mkMutex = () => {
  const tails = new Map<string, Promise<unknown>>()
  return async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    const prev = tails.get(key) ?? Promise.resolve()
    const run = prev.catch(() => {}).then(fn)
    tails.set(key, run)
    try {
      return await run
    } finally {
      if (tails.get(key) === run) tails.delete(key)
    }
  }
}

/**
 * The deploy API, served on the instance's own hostname (`https://<subdomain>.pockethost.io/_ph/deploy/v1/...` or its
 * custom domain). Because it is addressed by the instance host, any ingress that routes hosts to the cell that owns the
 * instance (see multi-region-plan.md) delivers it to the right node with no extra routing.
 *
 * Flow: `check` (manifest → missing hashes) → `blobs` (upload missing, gzip bundle) → `commit` (atomic swap + restart).
 */
export const createDeployRouter = (deps: DeployRouterDeps) => {
  const { dbg, info, warn, error } = deps.logger.create(`DeployApi`)
  const lock = mkMutex()
  const router = express.Router()

  type Ctx = { instance: InstanceFields; auth: DeployAuth; store: DeployStore }

  const authorize = async (req: Request, needWrite: boolean): Promise<Ctx> => {
    const host = hostOf(req)
    const instance = await deps.getInstanceByHost(host)
    if (!instance) throw new DeployHttpError(404, `${host} not found`)

    const resolve = async (fresh: boolean) => {
      try {
        return await deps.resolveAuth(req.headers.authorization, clientIp(req), { fresh })
      } catch (e) {
        if (e instanceof DeployAuthError) throw new DeployHttpError(e.status, e.message)
        throw e
      }
    }
    let auth = await resolve(false)
    // The token's instances may have just been edited in the dashboard: re-check before refusing.
    if (
      auth.via === 'pat' &&
      (instance as LegacyInstanceFields).uid === auth.userId &&
      !instanceAllowedByScope(auth, instance.id, (instance as LegacyInstanceFields).uid)
    ) {
      auth = await resolve(true)
    }

    // Same answer for "not yours" and "not in token scope" so tokens can't probe instance names.
    const ownerId = (instance as LegacyInstanceFields).uid
    if (ownerId !== auth.userId || !instanceAllowedByScope(auth, instance.id, ownerId)) {
      throw new DeployHttpError(404, `${host} not found`)
    }
    if (needWrite && !auth.scopes.includes('write')) {
      throw new DeployHttpError(403, `This token is read-only. Create a token with write access to deploy.`)
    }
    const owner = await deps.getUser(ownerId)
    const suspension = fileAccessSuspension(owner, instance)
    if (suspension) throw new DeployHttpError(403, suspension)

    return { instance, auth, store: deps.storeFor(instance) }
  }

  const handle =
    (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
      fn(req, res).catch((e) => {
        if (res.headersSent) return next(e)
        if (e instanceof DeployHttpError) {
          res.status(e.status).json({ status: e.status, message: e.message, ...e.extra })
          return
        }
        if (e instanceof FileApiError) {
          res.status(e.status).json({ status: e.status, message: e.message })
          return
        }
        if (e instanceof ManifestError || e instanceof BundleError) {
          res.status(400).json({ status: 400, message: e.message })
          return
        }
        if (e instanceof MissingBlobsError) {
          res.status(409).json({ status: 409, message: e.message, missing: e.missing })
          return
        }
        if (e instanceof DeployConflictError) {
          res.status(409).json({ status: 409, message: e.message })
          return
        }
        if ((e as { type?: string })?.type === 'entity.too.large') {
          res.status(413).json({ status: 413, message: `Request too large` })
          return
        }
        error(`Deploy API error`, e)
        res.status(500).json({ status: 500, message: `Deploy failed: ${(e as Error)?.message ?? e}` })
      })
    }

  const json = express.json({ limit: '20mb' })

  router.get(
    '/whoami',
    handle(async (req, res) => {
      const { instance, auth } = await authorize(req, false)
      res.json({
        instance: { id: instance.id, subdomain: instance.subdomain },
        via: auth.via,
        token: auth.tokenLabel || null,
        scopes: auth.scopes,
      })
    })
  )

  router.post(
    '/check',
    json,
    handle(async (req, res) => {
      const { store } = await authorize(req, true)
      const manifest = validateManifest(req.body?.files)
      const missing = await store.findMissing(manifest, deployOptions(req.body))
      const toDelete = await store.previewDeletes(manifest, deployOptions(req.body))
      dbg(`check: ${Object.keys(manifest).length} files, ${missing.length} missing, ${toDelete.length} to delete`)
      res.json({ missing, toDelete })
    })
  )

  router.post(
    '/blobs',
    express.raw({ type: () => true, limit: MAX_BUNDLE_BYTES }),
    handle(async (req, res) => {
      const { store } = await authorize(req, true)
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new DeployHttpError(400, `Empty upload`)
      const entries = decodeBundle(req.body, MAX_BUNDLE_RAW_BYTES)
      let stored = 0
      for (const { hash, data } of entries) {
        if (await store.putBlob(hash, data)) stored++
      }
      res.json({ received: entries.length, stored })
    })
  )

  router.post(
    '/commit',
    json,
    handle(async (req, res) => {
      const { instance, store } = await authorize(req, true)
      const manifest: Manifest = validateManifest(req.body?.files)
      const result = await lock(instance.id, async () => {
        await store.cleanTmp()
        // Slow work (copying, hashing) happens here, before the instance is touched.
        const staged = await store.stage(manifest, deployOptions(req.body))
        // Moving an old node_modules aside is a change too (it needs a stop), even when no file in it is listed.
        const changed = [
          ...staged.plan.toWrite,
          ...staged.plan.toDelete,
          ...(staged.replaceNodeModules ? ['node_modules'] : []),
        ]
        const nothingChanged = changed.length === 0
        // Static files are served straight from disk and each rename is atomic, so pb_public-only deploys skip the
        // restart. Anything else (hooks, migrations, package.json, node_modules) is applied while PocketBase is stopped.
        const needsRestart = changed.some((p) => !p.startsWith('pb_public/'))

        let applied
        let wasRunning = false
        if (!needsRestart) {
          applied = await store.apply(manifest, staged)
        } else {
          const out = await deps.withInstanceStopped(instance, () => store.apply(manifest, staged))
          applied = out.result
          wasRunning = out.wasRunning
        }

        // A no-op deploy (e.g. `pockethost dev` on startup) caches no manifest.
        let deployId: string | null = null
        if (!nothingChanged) {
          deployId = newDeployId()
          await store.recordManifest(deployId, manifest).catch((e) => warn(`recordManifest failed`, e))
          await store.gc().catch((e) => warn(`deploy gc failed`, e))
        }

        let restarted = false
        let startError: string | undefined
        if (wasRunning && instance.power) {
          try {
            await deps.startInstance(instance)
            restarted = true
          } catch (e) {
            startError = `${(e as Error)?.message ?? e}`
          }
        }

        return { deployId, applied, nothingChanged, wasRunning, restarted, startError }
      })

      const { deployId, applied, nothingChanged, wasRunning, restarted, startError } = result
      info(
        `deploy ${deployId} to ${instance.subdomain}: +${applied.written.length} -${applied.deleted.length} =${applied.unchanged}`
      )
      res.json({
        deployId,
        instance: { id: instance.id, subdomain: instance.subdomain },
        fileCount: Object.keys(manifest).length,
        written: applied.written.slice(0, 500),
        deleted: applied.deleted.slice(0, 500),
        writtenCount: applied.written.length,
        deletedCount: applied.deleted.length,
        unchanged: applied.unchanged,
        totalBytes: applied.totalBytes,
        replacedNodeModules: applied.replacedNodeModules,
        nothingChanged,
        wasRunning,
        restarted,
        startError,
      })
    })
  )

  router.use(
    '/files',
    createFilesRouter({
      authorize: async (req, needWrite) => {
        const { instance, store } = await authorize(req, needWrite)
        return { instance, instanceDir: store.instanceDir }
      },
      lock,
      handle,
    })
  )

  /** `GET /logs?n=100`: server-sent events, one `log` event per entry. Any token that can reach the instance may read. */
  router.get(
    '/logs',
    handle(async (req, res) => {
      const { instance } = await authorize(req, false)
      if (!deps.tailLogs) throw new DeployHttpError(404, `Logs are not available here`)
      const n = Math.min(Math.max(parseInt(`${req.query.n ?? '100'}`, 10) || 0, 0), 1000)
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=UTF-8',
        Connection: 'keep-alive',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      })
      res.flushHeaders?.()
      const unsub = deps.tailLogs(instance, n, (entry) => {
        res.write(`event: log\ndata: ${JSON.stringify(entry)}\n\n`)
      })
      // Comment lines keep idle connections open through proxies.
      const ping = setInterval(() => res.write(`: ping\n\n`), 25_000)
      await new Promise<void>((resolve) => {
        res.on('close', resolve)
        res.on('error', resolve)
      })
      clearInterval(ping)
      unsub()
    })
  )

  return router
}
