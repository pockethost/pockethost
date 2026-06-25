import express from 'express'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { Logger, TRUSTED_IP_CLIENT_HEADER } from 'src/common'
import {
  API_WEIGHT_NUM,
  FILES_WEIGHT_NUM,
  getConnectingIp,
  isHealthProbePath,
  isPocketBaseFilesPath,
  toMicroPointLimit,
  WEIGHT_DEN,
} from './rateLimiterPure'

export type RateLimiterOptions = {
  isTrustedConnectingIp?: (connectingIp: string | undefined, hostname: string) => Promise<boolean>
}

const headerContains = (header: string | string[] | undefined, token: string): boolean => {
  if (!header) return false
  const tokenLc = token.toLowerCase()
  if (Array.isArray(header)) return header.some((value) => value.toLowerCase().includes(tokenLc))
  return header.toLowerCase().includes(tokenLc)
}

const isCfImageService = (req: express.Request): boolean => {
  const viaMatches = headerContains(req.headers['via'], 'image-resizing-proxy')
  if (!viaMatches) return false

  const cdnLoopMatches = headerContains(req.headers['cdn-loop'], 'cloudflare')
  if (!cdnLoopMatches) return false

  return true
}

/** For rate-limit logs: raw Host / X-Forwarded-Host vs req.hostname (Express parses Host). */
const hostForensics = (req: express.Request) => {
  const rawHost = req.get('host')
  const forwardedHost = req.get('x-forwarded-host')
  const fromXfh = forwardedHost?.split(',')[0]?.trim().split(':')[0]?.toLowerCase()
  const xForwardedHostConflicts = fromXfh && req.hostname && fromXfh !== req.hostname.toLowerCase() ? true : undefined

  return {
    hostname: req.hostname,
    hostHeader: rawHost ?? null,
    xForwardedHost: forwardedHost ?? null,
    xForwardedHostConflicts,
    method: req.method,
    url: req.originalUrl?.slice(0, 256) ?? '',
  }
}

const formatLimitedIp = (endClientIp: string | undefined, connectingIp: string | undefined): string => {
  const ip = endClientIp ?? 'unknown'
  if (connectingIp && endClientIp && connectingIp !== endClientIp) {
    return `${ip} (connecting IP ${connectingIp})`
  }
  return ip
}

const formatIpOnInstance = (
  endClientIp: string | undefined,
  connectingIp: string | undefined,
  hostname: string
): string => `IP ${formatLimitedIp(endClientIp, connectingIp)} on instance ${hostname}`

const formatHourlyLimit = (points: number): string => `${points.toLocaleString('en-US')} requests/hour`

const formatConcurrentLimit = (points: number): string => `${points.toLocaleString('en-US')} concurrent requests`

const LIMITS = {
  untrustedIp: { points: 1000, duration: 60 * 60 },
  untrustedHostname: { points: 10000, duration: 60 * 60 },
  trustedIp: { points: 5000, duration: 60 * 60 },
  trustedHostname: { points: 20000, duration: 60 * 60 },
  untrustedIpConcurrent: { points: 15, duration: 0 },
  trustedIpConcurrent: { points: 50, duration: 0 },
  untrustedHostnameConcurrent: { points: 250, duration: 0 },
  trustedHostnameConcurrent: { points: 250, duration: 0 },
} as const

/** Scale bucket sizes so weighted consume keeps semantic API limits unchanged. */
export const createRateLimiterMiddleware = (logger: Logger, options: RateLimiterOptions = {}) => {
  const { isTrustedConnectingIp } = options
  const rateLimiterLogger = logger.create(`RateLimiter`)
  const { dbg } = rateLimiterLogger
  dbg(`Creating`)

  const getClientIp = async (
    req: express.Request,
    connectingIp: string | undefined,
    hostname: string,
    trustedConnectingIp: boolean
  ): Promise<string | undefined> => {
    if (trustedConnectingIp) {
      const customIp = req.headers[TRUSTED_IP_CLIENT_HEADER]
      if (customIp) return Array.isArray(customIp) ? customIp[0] : customIp
    }

    return connectingIp
  }

  const untrustedIpRateLimiter = new RateLimiterMemory(toMicroPointLimit(LIMITS.untrustedIp))
  const untrustedHostnameRateLimiter = new RateLimiterMemory(toMicroPointLimit(LIMITS.untrustedHostname))
  const trustedIpRateLimiter = new RateLimiterMemory(toMicroPointLimit(LIMITS.trustedIp))
  const trustedHostnameRateLimiter = new RateLimiterMemory(toMicroPointLimit(LIMITS.trustedHostname))

  const untrustedIpConcurrentLimiter = new RateLimiterMemory(toMicroPointLimit(LIMITS.untrustedIpConcurrent))
  const trustedIpConcurrentLimiter = new RateLimiterMemory(toMicroPointLimit(LIMITS.trustedIpConcurrent))
  const untrustedHostnameConcurrentLimiter = new RateLimiterMemory(
    toMicroPointLimit(LIMITS.untrustedHostnameConcurrent)
  )
  const trustedHostnameConcurrentLimiter = new RateLimiterMemory(toMicroPointLimit(LIMITS.trustedHostnameConcurrent))

  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (isHealthProbePath(req.path)) {
      next()
      return
    }

    const connectingIp = getConnectingIp(req)
    const hostname = req.hostname
    const cfImageService = isCfImageService(req)
    const trustedConnectingIp = isTrustedConnectingIp ? await isTrustedConnectingIp(connectingIp, hostname) : false
    const endClientIp = await getClientIp(req, connectingIp, hostname, trustedConnectingIp)
    const trustedClient = cfImageService || trustedConnectingIp
    const trustReason = cfImageService ? 'cf-image' : trustedConnectingIp ? 'trusted-ip' : 'none'

    const { dbg, warn } = rateLimiterLogger
      .create(hostname)
      .breadcrumb(connectingIp || `unknown`)
      .breadcrumb(endClientIp || `unknown`)
    const logRateLimitExceeded = trustedClient ? warn : dbg

    if (trustedClient) {
      dbg(`Trusted client detected (reason=${trustReason})`, req.headers)
    }

    dbg(`\n`)
    dbg(`--------------------------------`)
    dbg(`Incoming request`)
    dbg(`Hostname: ${hostname}`)
    dbg(`Connecting IP: ${connectingIp || `unknown`}`)
    dbg(`End Client IP: ${endClientIp || `unknown`}`)
    dbg(`Trust: ${trustedClient} (reason=${trustReason})`)
    dbg(`\n`)

    if (!hostname) {
      warn(
        `Could not determine hostname. connectingIp=${connectingIp ?? 'unknown'} endClientIp=${endClientIp ?? 'unknown'} hostHeader=${req.get('host') ?? 'none'} xForwardedHost=${req.get('x-forwarded-host') ?? 'none'}`
      )
      res.status(400).send(`Hostname not found`)
      return
    }

    if (trustedConnectingIp) {
      dbg(`Trusted IP detected`, req.headers)
    }

    const consumeWeight = isPocketBaseFilesPath(req.path) ? FILES_WEIGHT_NUM : API_WEIGHT_NUM

    {
      const key = `${endClientIp}:${hostname}`
      const cfg = trustedClient ? LIMITS.trustedIp : LIMITS.untrustedIp
      const limiter = trustedClient ? trustedIpRateLimiter : untrustedIpRateLimiter
      try {
        const ipResult = await limiter.consume(key, consumeWeight)
        dbg(
          `${trustedClient ? 'Trusted' : 'Untrusted'} IP request accepted. Key: ${key}. Points remaining: ${ipResult.remainingPoints}${
            trustedClient ? ' (trusted)' : ''
          } (weight=${consumeWeight}/${WEIGHT_DEN})`
        )
      } catch (rateLimiterRes: any) {
        const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000)
        logRateLimitExceeded(
          `${trustedClient ? 'Trusted' : 'Untrusted'} per-IP hourly rate limit exceeded. ` +
            `key=${key} endClientIp=${endClientIp ?? 'unknown'} connectingIp=${connectingIp ?? 'unknown'} ` +
            `hostname=${hostname} trustReason=${trustReason} ` +
            `path=${req.path} weight=${consumeWeight}/${WEIGHT_DEN} ` +
            `limitApproxApi=${cfg.points}/${cfg.duration}s ` +
            `consumedMp=${rateLimiterRes.consumedPoints ?? 'n/a'} remainingMp=${rateLimiterRes.remainingPoints ?? 'n/a'} ` +
            `retryAfter=${retryAfter}s`,
          hostForensics(req)
        )
        res.set('Retry-After', String(retryAfter))
        res
          .status(429)
          .send(
            `Too Many Requests: per-IP hourly limit of ${formatHourlyLimit(cfg.points)} exceeded for ${formatIpOnInstance(endClientIp, connectingIp, hostname)}; retry after ${retryAfter} seconds`
          )
        return
      }
    }

    {
      const key = hostname
      const cfg = trustedClient ? LIMITS.trustedHostname : LIMITS.untrustedHostname
      const limiter = trustedClient ? trustedHostnameRateLimiter : untrustedHostnameRateLimiter
      try {
        const hostnameResult = await limiter.consume(key, consumeWeight)
        dbg(
          `${trustedClient ? 'Trusted' : 'Untrusted'} Hostname request accepted. Key: ${key}. Points remaining: ${hostnameResult.remainingPoints}${
            trustedClient ? ' (trusted)' : ''
          } (weight=${consumeWeight}/${WEIGHT_DEN})`
        )
      } catch (rateLimiterRes: any) {
        const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000)
        logRateLimitExceeded(
          `${trustedClient ? 'Trusted' : 'Untrusted'} per-instance hourly rate limit exceeded. ` +
            `key=${key} endClientIp=${endClientIp ?? 'unknown'} connectingIp=${connectingIp ?? 'unknown'} ` +
            `hostname=${hostname} trustReason=${trustReason} ` +
            `path=${req.path} weight=${consumeWeight}/${WEIGHT_DEN} ` +
            `limitApproxApi=${cfg.points}/${cfg.duration}s ` +
            `consumedMp=${rateLimiterRes.consumedPoints ?? 'n/a'} remainingMp=${rateLimiterRes.remainingPoints ?? 'n/a'} ` +
            `retryAfter=${retryAfter}s`,
          hostForensics(req)
        )
        res.set('Retry-After', String(retryAfter))
        res
          .status(429)
          .send(
            `Too Many Requests: per-instance hourly limit of ${formatHourlyLimit(cfg.points)} exceeded for instance ${hostname}; retry after ${retryAfter} seconds`
          )
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

    const ipConcurrentLimiterInstance = trustedClient ? trustedIpConcurrentLimiter : untrustedIpConcurrentLimiter
    const ipConcurrentCfg = trustedClient ? LIMITS.trustedIpConcurrent : LIMITS.untrustedIpConcurrent
    const ipConcurrentKey = `${endClientIp}:${hostname}`
    try {
      const ipConcurrentResult = await ipConcurrentLimiterInstance.consume(ipConcurrentKey, consumeWeight)
      dbg(
        `${trustedClient ? 'Trusted' : 'Untrusted'} IP concurrent request accepted. Key: ${ipConcurrentKey}. Points remaining: ${ipConcurrentResult.remainingPoints}${
          trustedClient ? ' (trusted)' : ''
        } (weight=${consumeWeight}/${WEIGHT_DEN})`
      )
      releaseConcurrentCallbacks.push(async () => {
        const ipConcurrentReleaseResult = await ipConcurrentLimiterInstance.reward(ipConcurrentKey, consumeWeight)
        dbg(
          `${trustedClient ? 'Trusted' : 'Untrusted'} released IP concurrent point. Key: ${ipConcurrentKey}. Points remaining: ${ipConcurrentReleaseResult.remainingPoints}`
        )
      })
    } catch (rateLimiterRes: any) {
      try {
        await ipConcurrentLimiterInstance.reward(ipConcurrentKey, consumeWeight)
      } catch (rewardErr) {
        warn(`Failed to revert ${trustedClient ? 'trusted' : 'untrusted'} IP concurrent limiter.`, rewardErr)
      }
      logRateLimitExceeded(
        `${trustedClient ? 'Trusted' : 'Untrusted'} per-IP concurrent request limit exceeded. ` +
          `key=${ipConcurrentKey} endClientIp=${endClientIp ?? 'unknown'} connectingIp=${connectingIp ?? 'unknown'} ` +
          `hostname=${hostname} trustReason=${trustReason} ` +
          `path=${req.path} weight=${consumeWeight}/${WEIGHT_DEN} ` +
          `limitApproxApi=${ipConcurrentCfg.points} ` +
          `consumedMp=${rateLimiterRes.consumedPoints ?? 'n/a'} remainingMp=${rateLimiterRes.remainingPoints ?? 'n/a'}`,
        hostForensics(req)
      )
      res.set('Retry-After', '1')
      res
        .status(429)
        .send(
          `Too Many Requests: per-IP concurrent limit of ${formatConcurrentLimit(ipConcurrentCfg.points)} exceeded for ${formatIpOnInstance(endClientIp, connectingIp, hostname)}`
        )
      return
    }

    const hostnameConcurrentLimiterInstance = trustedClient
      ? trustedHostnameConcurrentLimiter
      : untrustedHostnameConcurrentLimiter
    const hostnameConcurrentCfg = trustedClient ? LIMITS.trustedHostnameConcurrent : LIMITS.untrustedHostnameConcurrent
    const hostnameConcurrentKey = hostname
    try {
      const hostnameConcurrentResult = await hostnameConcurrentLimiterInstance.consume(
        hostnameConcurrentKey,
        consumeWeight
      )
      dbg(
        `${trustedClient ? 'Trusted' : 'Untrusted'} hostname concurrent request accepted. Key: ${hostnameConcurrentKey}. Points remaining: ${hostnameConcurrentResult.remainingPoints}${
          trustedClient ? ' (trusted)' : ''
        } (weight=${consumeWeight}/${WEIGHT_DEN})`
      )
      releaseConcurrentCallbacks.push(async () => {
        const hostnameConcurrentReleaseResult = await hostnameConcurrentLimiterInstance.reward(
          hostnameConcurrentKey,
          consumeWeight
        )
        dbg(
          `${trustedClient ? 'Trusted' : 'Untrusted'} released hostname concurrent point. Key: ${hostnameConcurrentKey}. Points remaining: ${hostnameConcurrentReleaseResult.remainingPoints}`
        )
      })
    } catch (rateLimiterRes: any) {
      await releaseConcurrentPoints()
      logRateLimitExceeded(
        `${trustedClient ? 'Trusted' : 'Untrusted'} per-instance concurrent request limit exceeded. ` +
          `key=${hostnameConcurrentKey} endClientIp=${endClientIp ?? 'unknown'} connectingIp=${connectingIp ?? 'unknown'} ` +
          `hostname=${hostname} trustReason=${trustReason} ` +
          `path=${req.path} weight=${consumeWeight}/${WEIGHT_DEN} ` +
          `limitApproxApi=${hostnameConcurrentCfg.points} ` +
          `consumedMp=${rateLimiterRes.consumedPoints ?? 'n/a'} remainingMp=${rateLimiterRes.remainingPoints ?? 'n/a'}`,
        hostForensics(req)
      )
      res.set('Retry-After', '1')
      res
        .status(429)
        .send(
          `Too Many Requests: per-instance concurrent limit of ${formatConcurrentLimit(hostnameConcurrentCfg.points)} exceeded for instance ${hostname}`
        )
      return
    }

    res.on('finish', releaseConcurrentPoints)
    res.on('close', releaseConcurrentPoints)

    next()
  }
}
