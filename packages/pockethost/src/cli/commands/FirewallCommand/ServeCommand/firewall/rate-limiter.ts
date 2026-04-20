import express from 'express'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { Logger } from 'src/common'

const getConnectingIp = (req: express.Request): string | undefined => {
  // Check Cloudflare headers
  const cf = req.headers['cf-connecting-ip'] || req.headers['true-client-ip']
  if (cf) return Array.isArray(cf) ? cf[0] : cf

  // Check X-Forwarded-For
  const xff = req.headers['x-forwarded-for']
  const xffStr = Array.isArray(xff) ? xff.join(',') : xff
  if (typeof xffStr === 'string') {
    const ip = xffStr.split(',')?.[0]?.trim()
    if (ip) return ip
  }

  // Check X-Real-IP
  const xri = req.headers['x-real-ip']
  if (xri) return Array.isArray(xri) ? xri[0] : xri

  return req.ip || req.socket?.remoteAddress
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

// Middleware factory to create a rate limiting middleware
export const createRateLimiterMiddleware = (logger: Logger, trustedUserProxyIps: string[] = []) => {
  const rateLimiterLogger = logger.create(`RateLimiter`)
  const { dbg, warn } = rateLimiterLogger
  dbg(`Creating`)
  if (trustedUserProxyIps.length > 0) {
    dbg(`User proxy IPs: ${trustedUserProxyIps.join(', ')}`)
  }

  const isTrustedUserProxy = (connectingIp: string | undefined): boolean => {
    if (!connectingIp) return false
    return trustedUserProxyIps.includes(connectingIp)
  }

  const getClientIp = (req: express.Request): string | undefined => {
    const connectingIp = getConnectingIp(req)

    // If from user proxy, check custom header first
    if (isTrustedUserProxy(connectingIp)) {
      const customIp = req.headers['x-pockethost-client-ip']
      if (customIp) return Array.isArray(customIp) ? customIp[0] : customIp
    }

    return connectingIp
  }

  const untrustedIpRateLimiter = new RateLimiterMemory(LIMITS.untrustedIp)
  const untrustedHostnameRateLimiter = new RateLimiterMemory(LIMITS.untrustedHostname)
  const trustedIpRateLimiter = new RateLimiterMemory(LIMITS.trustedIp)
  const trustedHostnameRateLimiter = new RateLimiterMemory(LIMITS.trustedHostname)

  // Concurrent request limiters (duration 0 means we manually manage release)
  const untrustedIpConcurrentLimiter = new RateLimiterMemory(LIMITS.untrustedIpConcurrent)
  const trustedIpConcurrentLimiter = new RateLimiterMemory(LIMITS.trustedIpConcurrent)
  const untrustedHostnameConcurrentLimiter = new RateLimiterMemory(LIMITS.untrustedHostnameConcurrent)
  const trustedHostnameConcurrentLimiter = new RateLimiterMemory(LIMITS.trustedHostnameConcurrent)

  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const connectingIp = getConnectingIp(req)
    const endClientIp = getClientIp(req)
    const hostname = req.hostname
    const cfImageService = isCfImageService(req)
    const userProxy = isTrustedUserProxy(connectingIp)
    const trustedClient = cfImageService || userProxy
    const trustReason = cfImageService ? 'cf-image' : userProxy ? 'user-proxy' : 'none'

    const { dbg, warn, info } = rateLimiterLogger
      .create(hostname)
      .breadcrumb(connectingIp || `unknown`)
      .breadcrumb(endClientIp || `unknown`)

    if (trustedClient) {
      info(`Trusted client detected (reason=${trustReason})`, req.headers)
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

    if (isTrustedUserProxy(connectingIp)) {
      dbg(`User Proxy IP detected`, req.headers)
    }

    // Check rate limits first (requests per hour per IP per hostname)
    {
      const key = `${endClientIp}:${hostname}`
      const cfg = trustedClient ? LIMITS.trustedIp : LIMITS.untrustedIp
      const limiter = trustedClient ? trustedIpRateLimiter : untrustedIpRateLimiter
      try {
        const ipResult = await limiter.consume(key)
        dbg(
          `${trustedClient ? 'Trusted' : 'Untrusted'} IP request accepted. Key: ${key}. Points remaining: ${ipResult.remainingPoints}${
            trustedClient ? ' (trusted)' : ''
          }`
        )
      } catch (rateLimiterRes: any) {
        const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000)
        warn(
          `[1] ${trustedClient ? 'Trusted' : 'Untrusted'} IP rate limit exceeded. ` +
            `key=${key} endClientIp=${endClientIp ?? 'unknown'} connectingIp=${connectingIp ?? 'unknown'} ` +
            `hostname=${hostname} trustReason=${trustReason} ` +
            `limit=${cfg.points}/${cfg.duration}s consumed=${rateLimiterRes.consumedPoints} ` +
            `remaining=${rateLimiterRes.remainingPoints} retryAfter=${retryAfter}s`,
          hostForensics(req)
        )
        res.set('Retry-After', String(retryAfter))
        res.status(429).send(`Too Many Requests: retry after ${retryAfter} seconds [1]`)
        return
      }
    }

    // Check hostname rate limit (requests per hour per hostname)
    {
      const key = hostname
      const cfg = trustedClient ? LIMITS.trustedHostname : LIMITS.untrustedHostname
      const limiter = trustedClient ? trustedHostnameRateLimiter : untrustedHostnameRateLimiter
      try {
        const hostnameResult = await limiter.consume(key)
        dbg(
          `${trustedClient ? 'Trusted' : 'Untrusted'} Hostname request accepted. Key: ${key}. Points remaining: ${hostnameResult.remainingPoints}${
            trustedClient ? ' (trusted)' : ''
          }`
        )
      } catch (rateLimiterRes: any) {
        const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000)
        warn(
          `[2] ${trustedClient ? 'Trusted' : 'Untrusted'} Hostname rate limit exceeded. ` +
            `key=${key} endClientIp=${endClientIp ?? 'unknown'} connectingIp=${connectingIp ?? 'unknown'} ` +
            `hostname=${hostname} trustReason=${trustReason} ` +
            `limit=${cfg.points}/${cfg.duration}s consumed=${rateLimiterRes.consumedPoints} ` +
            `remaining=${rateLimiterRes.remainingPoints} retryAfter=${retryAfter}s`,
          hostForensics(req)
        )
        res.set('Retry-After', String(retryAfter))
        res.status(429).send(`Too Many Requests: retry after ${retryAfter} seconds [2]`)
        return
      }
    }

    const releaseConcurrentCallbacks: Array<() => Promise<void>> = []

    // Helper to release concurrent points
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

    // Check concurrent limits per IP per hostname
    const ipConcurrentLimiterInstance = trustedClient ? trustedIpConcurrentLimiter : untrustedIpConcurrentLimiter
    const ipConcurrentCfg = trustedClient ? LIMITS.trustedIpConcurrent : LIMITS.untrustedIpConcurrent
    const ipConcurrentKey = `${endClientIp}:${hostname}`
    try {
      const ipConcurrentResult = await ipConcurrentLimiterInstance.consume(ipConcurrentKey)
      dbg(
        `${trustedClient ? 'Trusted' : 'Untrusted'} IP concurrent request accepted. Key: ${ipConcurrentKey}. Points remaining: ${ipConcurrentResult.remainingPoints}${
          trustedClient ? ' (trusted)' : ''
        }`
      )
      releaseConcurrentCallbacks.push(async () => {
        const ipConcurrentReleaseResult = await ipConcurrentLimiterInstance.reward(ipConcurrentKey, 1)
        dbg(
          `${trustedClient ? 'Trusted' : 'Untrusted'} released IP concurrent point. Key: ${ipConcurrentKey}. Points remaining: ${ipConcurrentReleaseResult.remainingPoints}`
        )
      })
    } catch (rateLimiterRes: any) {
      try {
        await ipConcurrentLimiterInstance.reward(ipConcurrentKey, 1)
      } catch (rewardErr) {
        warn(`Failed to revert ${trustedClient ? 'trusted' : 'untrusted'} IP concurrent limiter.`, rewardErr)
      }
      warn(
        `[3] ${trustedClient ? 'Trusted' : 'Untrusted'} IP concurrent limit exceeded. ` +
          `key=${ipConcurrentKey} endClientIp=${endClientIp ?? 'unknown'} connectingIp=${connectingIp ?? 'unknown'} ` +
          `hostname=${hostname} trustReason=${trustReason} ` +
          `limit=${ipConcurrentCfg.points} consumed=${rateLimiterRes.consumedPoints} ` +
          `remaining=${rateLimiterRes.remainingPoints}`,
        hostForensics(req)
      )
      res.set('Retry-After', '1')
      res.status(429).send(`Too Many Requests: concurrent request limit exceeded [3]`)
      return
    }

    // Check overall concurrent limits per host
    const hostnameConcurrentLimiterInstance = trustedClient
      ? trustedHostnameConcurrentLimiter
      : untrustedHostnameConcurrentLimiter
    const hostnameConcurrentCfg = trustedClient ? LIMITS.trustedHostnameConcurrent : LIMITS.untrustedHostnameConcurrent
    const hostnameConcurrentKey = hostname
    try {
      const hostnameConcurrentResult = await hostnameConcurrentLimiterInstance.consume(hostnameConcurrentKey)
      dbg(
        `${trustedClient ? 'Trusted' : 'Untrusted'} hostname concurrent request accepted. Key: ${hostnameConcurrentKey}. Points remaining: ${hostnameConcurrentResult.remainingPoints}${
          trustedClient ? ' (trusted)' : ''
        }`
      )
      releaseConcurrentCallbacks.push(async () => {
        const hostnameConcurrentReleaseResult = await hostnameConcurrentLimiterInstance.reward(hostnameConcurrentKey, 1)
        dbg(
          `${trustedClient ? 'Trusted' : 'Untrusted'} released hostname concurrent point. Key: ${hostnameConcurrentKey}. Points remaining: ${hostnameConcurrentReleaseResult.remainingPoints}`
        )
      })
    } catch (rateLimiterRes: any) {
      try {
        await hostnameConcurrentLimiterInstance.reward(hostnameConcurrentKey, 1)
      } catch (rewardErr) {
        warn(`Failed to revert ${trustedClient ? 'trusted' : 'untrusted'} hostname concurrent limiter.`, rewardErr)
      }
      await releaseConcurrentPoints()
      warn(
        `[4] ${trustedClient ? 'Trusted' : 'Untrusted'} Hostname concurrent limit exceeded. ` +
          `key=${hostnameConcurrentKey} endClientIp=${endClientIp ?? 'unknown'} connectingIp=${connectingIp ?? 'unknown'} ` +
          `hostname=${hostname} trustReason=${trustReason} ` +
          `limit=${hostnameConcurrentCfg.points} consumed=${rateLimiterRes.consumedPoints} ` +
          `remaining=${rateLimiterRes.remainingPoints}`,
        hostForensics(req)
      )
      res.set('Retry-After', '1')
      res.status(429).send(`Too Many Requests: concurrent request limit exceeded [4]`)
      return
    }

    // Release concurrent points when response finishes
    res.on('finish', releaseConcurrentPoints)
    res.on('close', releaseConcurrentPoints)

    next()
  }
}
