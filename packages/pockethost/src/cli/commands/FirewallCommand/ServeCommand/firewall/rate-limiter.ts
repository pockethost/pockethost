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

  const untrustedIpRateLimiter = new RateLimiterMemory({
    points: 1000,
    duration: 60 * 60,
  })

  const untrustedHostnameRateLimiter = new RateLimiterMemory({
    points: 10000,
    duration: 60 * 60,
  })

  const trustedIpRateLimiter = new RateLimiterMemory({
    points: 5000,
    duration: 60 * 60,
  })

  const trustedHostnameRateLimiter = new RateLimiterMemory({
    points: 20000,
    duration: 60 * 60,
  })

  // Concurrent request limiters
  const untrustedIpConcurrentLimiter = new RateLimiterMemory({
    points: 5,
    duration: 0, // Duration 0 means we manually manage release
  })

  const trustedIpConcurrentLimiter = new RateLimiterMemory({
    points: 50,
    duration: 0,
  })

  const untrustedHostnameConcurrentLimiter = new RateLimiterMemory({
    points: 50,
    duration: 0,
  })

  const trustedHostnameConcurrentLimiter = new RateLimiterMemory({
    points: 200,
    duration: 0,
  })

  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const connectingIp = getConnectingIp(req)
    const endClientIp = getClientIp(req)
    const hostname = req.hostname
    const cfImageService = isCfImageService(req)
    const trustedClient = cfImageService || isTrustedUserProxy(connectingIp)

    const { dbg, warn, info } = rateLimiterLogger
      .create(hostname)
      .breadcrumb(connectingIp || `unknown`)
      .breadcrumb(endClientIp || `unknown`)

    if (trustedClient) {
      info(`Trusted client detected`, req.headers)
    }

    dbg(`\n`)
    dbg(`--------------------------------`)
    dbg(`Incoming request`)
    dbg(`Hostname: ${hostname}`)
    dbg(`Connecting IP: ${connectingIp || `unknown`}`)
    dbg(`End Client IP: ${endClientIp || `unknown`}`)
    dbg(`\n`)

    if (!hostname) {
      warn(`Could not determine hostname`)
      res.status(429).send(`Hostname not found`)
      return
    }

    if (isTrustedUserProxy(connectingIp)) {
      dbg(`User Proxy IP detected`, req.headers)
    }

    // Check rate limits first (requests per hour per IP per hostname)
    try {
      const key = `${endClientIp}:${hostname}`
      const limiter = trustedClient ? trustedIpRateLimiter : untrustedIpRateLimiter
      const ipResult = await limiter.consume(key)
      dbg(
        `${trustedClient ? 'Trusted' : 'Untrusted'} IP request accepted. Key: ${key}. Points remaining: ${ipResult.remainingPoints}${
          trustedClient ? ' (trusted)' : ''
        }`
      )
    } catch (rateLimiterRes: any) {
      const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000)
      warn(`${trustedClient ? 'Trusted' : 'Untrusted'} IP rate limit exceeded. Retry after ${retryAfter} seconds`)
      res.set('Retry-After', String(retryAfter))
      res.status(429).send(`Too Many Requests: retry after ${retryAfter} seconds [1]`)
      return
    }

    // Check hostname rate limit (requests per hour per hostname)
    try {
      const key = hostname
      const limiter = trustedClient ? trustedHostnameRateLimiter : untrustedHostnameRateLimiter
      const hostnameResult = await limiter.consume(key)
      dbg(
        `${trustedClient ? 'Trusted' : 'Untrusted'} Hostname request accepted. Key: ${key}. Points remaining: ${hostnameResult.remainingPoints}${
          trustedClient ? ' (trusted)' : ''
        }`
      )
    } catch (rateLimiterRes: any) {
      const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000)
      warn(`${trustedClient ? 'Trusted' : 'Untrusted'} Hostname rate limit exceeded. Retry after ${retryAfter} seconds`)
      res.set('Retry-After', String(retryAfter))
      res.status(429).send(`Too Many Requests: retry after ${retryAfter} seconds [2]`)
      return
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
    try {
      const limiter = trustedClient ? trustedIpConcurrentLimiter : untrustedIpConcurrentLimiter
      const key = `${endClientIp}:${hostname}`
      const ipConcurrentResult = await limiter.consume(key)
      dbg(
        `${trustedClient ? 'Trusted' : 'Untrusted'} IP concurrent request accepted. Key: ${key}. Points remaining: ${ipConcurrentResult.remainingPoints}${
          trustedClient ? ' (trusted)' : ''
        }`
      )
      releaseConcurrentCallbacks.push(async () => {
        const ipConcurrentReleaseResult = await limiter.reward(key, 1)
        dbg(
          `${trustedClient ? 'Trusted' : 'Untrusted'} released IP concurrent point. Key: ${key}. Points remaining: ${ipConcurrentReleaseResult.remainingPoints}`
        )
      })
    } catch (rateLimiterRes: any) {
      warn(`${trustedClient ? 'Trusted' : 'Untrusted'} IP concurrent limit exceeded.`)
      res.status(429).send(`Too Many Requests: concurrent request limit exceeded [3]`)
      return
    }

    // Check overall concurrent limits per host
    try {
      const key = hostname
      const limiter = trustedClient ? trustedHostnameConcurrentLimiter : untrustedHostnameConcurrentLimiter
      const hostnameConcurrentResult = await limiter.consume(key)
      dbg(
        `${trustedClient ? 'Trusted' : 'Untrusted'} hostname concurrent request accepted. Key: ${key}. Points remaining: ${hostnameConcurrentResult.remainingPoints}${
          trustedClient ? ' (trusted)' : ''
        }`
      )
      releaseConcurrentCallbacks.push(async () => {
        const hostnameConcurrentReleaseResult = await limiter.reward(key, 1)
        dbg(
          `${trustedClient ? 'Trusted' : 'Untrusted'} released hostname concurrent point. Key: ${key}. Points remaining: ${hostnameConcurrentReleaseResult.remainingPoints}`
        )
      })
    } catch (rateLimiterRes: any) {
      await releaseConcurrentPoints()
      warn(`${trustedClient ? 'Trusted' : 'Untrusted'} hostname concurrent limit exceeded.`)
      res.status(429).send(`Too Many Requests: concurrent request limit exceeded [4]`)
      return
    }

    // Release concurrent points when response finishes
    res.on('finish', releaseConcurrentPoints)
    res.on('close', releaseConcurrentPoints)

    next()
  }
}
