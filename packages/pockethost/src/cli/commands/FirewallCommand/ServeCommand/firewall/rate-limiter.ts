import express from 'express'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { Logger } from 'src/common'
import { mkLimiterPool, WEIGHT_DEN } from './limiterPool'
import { getConnectingIp, isCfImageService, resolveRequestPolicy, MirrorApi } from './resolveRequestPolicy'

/** For rate-limit logs: raw Host / X-Forwarded-Host vs req.hostname (Express parses Host). */
const hostForensics = (req: express.Request) => {
  const rawHost = req.get('host')
  const forwardedHost = req.get('x-forwarded-host')
  const fromXfh = forwardedHost?.split(',')[0]?.trim().split(':')[0]?.toLowerCase()
  const xForwardedHostConflicts =
    fromXfh && req.hostname && fromXfh !== req.hostname.toLowerCase() ? true : undefined

  return {
    hostname: req.hostname,
    hostHeader: rawHost ?? null,
    xForwardedHost: forwardedHost ?? null,
    xForwardedHostConflicts,
    method: req.method,
    url: req.originalUrl?.slice(0, 256) ?? '',
  }
}

/** Max Retry-After (seconds) for hourly quota breaches — avoids hour-long lockouts after bursts. */
const HOURLY_RETRY_AFTER_CAP_SEC = 60
const BURST_DURATION_SEC = 60
const HOURLY_DURATION_SEC = 60 * 60

/** Larger denominator → cheaper file routes vs API (FILES_WEIGHT_NUM / WEIGHT_DEN). */
const FILES_WEIGHT_NUM = 1
const API_WEIGHT_NUM = WEIGHT_DEN

const isPocketBaseFilesPath = (path: string): boolean =>
  path === '/api/files' || path.startsWith('/api/files/')

const cappedRetryAfterSec = (msBeforeNext: number | undefined, capSec: number): number =>
  Math.max(1, Math.min(Math.ceil((msBeforeNext ?? 1000) / 1000), capSec))

export type RateLimiterMiddlewareConfig = {
  logger: Logger
  globalProxyIps?: string[]
  mirror: MirrorApi
}

export const createRateLimiterMiddleware = ({
  logger,
  globalProxyIps = [],
  mirror,
}: RateLimiterMiddlewareConfig) => {
  const rateLimiterLogger = logger.create(`RateLimiter`)
  const { dbg, warn } = rateLimiterLogger
  dbg(`Creating`)
  if (globalProxyIps.length > 0) {
    dbg(`Global proxy IPs: ${globalProxyIps.join(', ')}`)
  }

  const limiterPool = mkLimiterPool()

  const consumeLimit = async ({
    limiter,
    key,
    weight,
    limitPoints,
    durationSec,
  }: {
    limiter: RateLimiterMemory
    key: string
    weight: number
    limitPoints: number
    durationSec: number
  }) => {
    try {
      const result = await limiter.consume(key, weight)
      return { ok: true as const, result }
    } catch (rateLimiterRes: any) {
      const retryAfter =
        durationSec === HOURLY_DURATION_SEC
          ? cappedRetryAfterSec(rateLimiterRes.msBeforeNext, HOURLY_RETRY_AFTER_CAP_SEC)
          : cappedRetryAfterSec(rateLimiterRes.msBeforeNext, durationSec)
      return { ok: false as const, rateLimiterRes, retryAfter, limitPoints, durationSec }
    }
  }

  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const hostname = req.hostname
    const connectingIp = getConnectingIp(req)
    const { dbg, warn, info } = rateLimiterLogger.create(hostname || 'unknown')

    if (!hostname) {
      warn(
        `Could not determine hostname. connectingIp=${connectingIp ?? 'unknown'} hostHeader=${req.get('host') ?? 'none'} xForwardedHost=${req.get('x-forwarded-host') ?? 'none'}`
      )
      res.status(400).send(`Hostname not found`)
      return
    }

    const policy = await resolveRequestPolicy({
      req,
      hostname,
      mirror,
      globalProxyIps,
    })

    const { endClientIp, limits, ipLimits, ipLimitMode, trustReason, isProxyMode } = policy

    const hostnameLogger = rateLimiterLogger
      .create(hostname)
      .breadcrumb(connectingIp || `unknown`)
      .breadcrumb(endClientIp || `unknown`)
    const hostnameDbg = hostnameLogger.dbg.bind(hostnameLogger)
    const hostnameWarn = hostnameLogger.warn.bind(hostnameLogger)
    const hostnameInfo = hostnameLogger.info.bind(hostnameLogger)

    if (ipLimitMode !== 'default' || isCfImageService(req)) {
      hostnameInfo(`Rate limit policy (mode=${ipLimitMode}, reason=${trustReason})`, req.headers)
    }

    hostnameDbg(`\n`)
    hostnameDbg(`--------------------------------`)
    hostnameDbg(`Incoming request`)
    hostnameDbg(`Hostname: ${hostname}`)
    hostnameDbg(`Connecting IP: ${connectingIp || `unknown`}`)
    hostnameDbg(`End Client IP: ${endClientIp || `unknown`}`)
    hostnameDbg(`IP limit mode: ${ipLimitMode} (reason=${trustReason})`)
    hostnameDbg(`Limits: ${JSON.stringify(limits)}`)
    hostnameDbg(`\n`)

    const consumeWeight = isPocketBaseFilesPath(req.path) ? FILES_WEIGHT_NUM : API_WEIGHT_NUM

    const ipBurstLimiter = limiterPool.get(ipLimits.ipBurst, BURST_DURATION_SEC)
    const hostnameBurstLimiter = limiterPool.get(limits.hostnameBurst, BURST_DURATION_SEC)
    const ipHourlyLimiter = limiterPool.get(ipLimits.ipHourly, HOURLY_DURATION_SEC)
    const hostnameHourlyLimiter = limiterPool.get(limits.hostnameHourly, HOURLY_DURATION_SEC)
    const ipConcurrentLimiter = limiterPool.get(ipLimits.ipConcurrent, 0)
    const hostnameConcurrentLimiter = limiterPool.get(limits.hostnameConcurrent, 0)

    const ipKey = `${endClientIp}:${hostname}`

    {
      const burst = await consumeLimit({
        limiter: ipBurstLimiter,
        key: ipKey,
        weight: consumeWeight,
        limitPoints: ipLimits.ipBurst,
        durationSec: BURST_DURATION_SEC,
      })
      if (!burst.ok) {
        hostnameWarn(
          `[1] IP burst limit exceeded. key=${ipKey} mode=${ipLimitMode} reason=${trustReason} ` +
            `limit=${burst.limitPoints}/${burst.durationSec}s retryAfter=${burst.retryAfter}s`,
          hostForensics(req)
        )
        res.set('Retry-After', String(burst.retryAfter))
        res.status(429).send(`Too Many Requests: retry after ${burst.retryAfter} seconds [1]`)
        return
      }
    }

    {
      const burst = await consumeLimit({
        limiter: hostnameBurstLimiter,
        key: hostname,
        weight: consumeWeight,
        limitPoints: limits.hostnameBurst,
        durationSec: BURST_DURATION_SEC,
      })
      if (!burst.ok) {
        hostnameWarn(
          `[2] Hostname burst limit exceeded. key=${hostname} mode=${ipLimitMode} reason=${trustReason} ` +
            `limit=${burst.limitPoints}/${burst.durationSec}s retryAfter=${burst.retryAfter}s`,
          hostForensics(req)
        )
        res.set('Retry-After', String(burst.retryAfter))
        res.status(429).send(`Too Many Requests: retry after ${burst.retryAfter} seconds [2]`)
        return
      }
    }

    const releaseConcurrentCallbacks: Array<() => Promise<void>> = []

    const releaseConcurrentPoints = async () => {
      if (releaseConcurrentCallbacks.length === 0) return
      const callbacks = releaseConcurrentCallbacks.splice(0, releaseConcurrentCallbacks.length)
      await Promise.all(
        callbacks.map(async (release) => {
          try {
            await release()
          } catch (err) {
            warn(`Failed releasing concurrent limiter point`, err)
          }
        })
      )
    }

    try {
      const ipConcurrentResult = await ipConcurrentLimiter.consume(ipKey, consumeWeight)
      releaseConcurrentCallbacks.push(async () => {
        await ipConcurrentLimiter.reward(ipKey, consumeWeight)
      })
      hostnameDbg(`IP concurrent accepted. Key: ${ipKey}. Remaining: ${ipConcurrentResult.remainingPoints}`)
    } catch {
      try {
        await ipConcurrentLimiter.reward(ipKey, consumeWeight)
      } catch (rewardErr) {
        hostnameWarn(`Failed to revert IP concurrent limiter.`, rewardErr)
      }
      hostnameWarn(
        `[3] IP concurrent limit exceeded. key=${ipKey} mode=${ipLimitMode} limit=${ipLimits.ipConcurrent}`,
        hostForensics(req)
      )
      res.set('Retry-After', '1')
      res.status(429).send(`Too Many Requests: concurrent request limit exceeded [3]`)
      return
    }

    try {
      await hostnameConcurrentLimiter.consume(hostname, consumeWeight)
      releaseConcurrentCallbacks.push(async () => {
        await hostnameConcurrentLimiter.reward(hostname, consumeWeight)
      })
    } catch {
      await releaseConcurrentPoints()
      hostnameWarn(
        `[4] Hostname concurrent limit exceeded. key=${hostname} limit=${limits.hostnameConcurrent}`,
        hostForensics(req)
      )
      res.set('Retry-After', '1')
      res.status(429).send(`Too Many Requests: concurrent request limit exceeded [4]`)
      return
    }

    {
      const hourly = await consumeLimit({
        limiter: ipHourlyLimiter,
        key: ipKey,
        weight: consumeWeight,
        limitPoints: ipLimits.ipHourly,
        durationSec: HOURLY_DURATION_SEC,
      })
      if (!hourly.ok) {
        await releaseConcurrentPoints()
        hostnameWarn(
          `[5] IP hourly limit exceeded. key=${ipKey} mode=${ipLimitMode} limit=${hourly.limitPoints}/${hourly.durationSec}s retryAfter=${hourly.retryAfter}s`,
          hostForensics(req)
        )
        res.set('Retry-After', String(hourly.retryAfter))
        res.status(429).send(`Too Many Requests: retry after ${hourly.retryAfter} seconds [5]`)
        return
      }
    }

    {
      const hourly = await consumeLimit({
        limiter: hostnameHourlyLimiter,
        key: hostname,
        weight: consumeWeight,
        limitPoints: limits.hostnameHourly,
        durationSec: HOURLY_DURATION_SEC,
      })
      if (!hourly.ok) {
        await releaseConcurrentPoints()
        hostnameWarn(
          `[6] Hostname hourly limit exceeded. key=${hostname} limit=${hourly.limitPoints}/${hourly.durationSec}s retryAfter=${hourly.retryAfter}s`,
          hostForensics(req)
        )
        res.set('Retry-After', String(hourly.retryAfter))
        res.status(429).send(`Too Many Requests: retry after ${hourly.retryAfter} seconds [6]`)
        return
      }
    }

    if (isProxyMode) {
      hostnameDbg(`Proxy mode request routed via end client IP ${endClientIp}`)
    }

    res.on('finish', releaseConcurrentPoints)
    res.on('close', releaseConcurrentPoints)

    next()
  }
}
