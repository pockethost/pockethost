import {
  canFetch,
  DAEMON_PORT,
  Logger,
  mkInternalUrl,
  PH_FIREWALL_DAEMON_GRACE_MS,
  PH_FIREWALL_DAEMON_GRACE_RETRY_MS,
} from '@'
import type { ErrorRequestHandler, RequestHandler, Response } from 'express'
import { isHealthProbePath } from './rateLimiterPure'

const daemonHealthUrl = () => `${mkInternalUrl(DAEMON_PORT())}/_api/daemon/health`

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export const isDaemonUnreachableError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : `${err}`
  const code = err && typeof err === 'object' && 'code' in err ? `${(err as { code?: string }).code}` : ''
  return /ECONNREFUSED|ECONNRESET|EPIPE|ETIMEDOUT|socket hang up/i.test(`${code} ${msg}`)
}

export const sendDaemonUnavailable = (res: Response) => {
  if (res.headersSent || res.writableEnded) return
  res.set('Retry-After', '5')
  res
    .status(503)
    .send('PocketHost edge is temporarily unavailable while the hosting daemon restarts. Please retry shortly.')
}

export const createDaemonGraceMiddleware = (logger: Logger): RequestHandler => {
  const { dbg, info } = logger.create(`firewall:daemon-grace`)
  let lastOutageLogAt = 0

  return async (req, res, next) => {
    const graceMs = PH_FIREWALL_DAEMON_GRACE_MS()
    const retryMs = PH_FIREWALL_DAEMON_GRACE_RETRY_MS()

    if (graceMs <= 0 || isHealthProbePath(req.path)) {
      next()
      return
    }

    const deadline = Date.now() + graceMs

    while (Date.now() < deadline) {
      if (req.aborted || res.writableEnded || res.headersSent) return

      const remaining = deadline - Date.now()
      if (remaining <= 0) break

      if (await canFetch(daemonHealthUrl(), Math.min(retryMs, remaining))) {
        next()
        return
      }

      if (Date.now() - lastOutageLogAt > 5000) {
        info(`Daemon unavailable — holding traffic up to ${graceMs}ms (PH_FIREWALL_DAEMON_GRACE_MS)`)
        lastOutageLogAt = Date.now()
      }

      dbg(`Daemon health check failed, retrying in ${retryMs}ms`)
      await sleep(Math.min(retryMs, deadline - Date.now()))
    }

    if (!res.headersSent && !res.writableEnded) {
      sendDaemonUnavailable(res)
    }
  }
}

export const createDaemonProxyErrorHandler = (logger: Logger): ErrorRequestHandler => {
  const { error } = logger.create(`firewall:daemon-proxy`)

  return (err, req, res, next) => {
    if (res.headersSent) {
      next(err)
      return
    }

    if (isDaemonUnreachableError(err)) {
      sendDaemonUnavailable(res)
      return
    }

    error(err)
    res.status(502).send(err instanceof Error ? err.message : String(err))
  }
}
