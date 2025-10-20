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

// Middleware factory to create a rate limiting middleware
export const createRateLimiterMiddleware = (
  logger: Logger,
  userProxyIps: string[] = [],
  userProxyWhitelistIps: string[] = []
) => {
  const rateLimiterLogger = logger.create(`RateLimiter`)
  const { dbg, warn } = rateLimiterLogger
  dbg(`Creating`)
  if (userProxyIps.length > 0) {
    dbg(`User proxy IPs: ${userProxyIps.join(', ')}`)
  }
  if (userProxyWhitelistIps.length > 0) {
    dbg(`User proxy whitelist IPs (bypass rate limiting): ${userProxyWhitelistIps.join(', ')}`)
  }

  const isUserProxy = (connectingIp: string | undefined): boolean => {
    if (!connectingIp) return false
    return userProxyIps.includes(connectingIp)
  }

  const getClientIp = (req: express.Request): string | undefined => {
    const connectingIp = getConnectingIp(req)

    // If from user proxy, check custom header first
    if (isUserProxy(connectingIp)) {
      const customIp = req.headers['x-pockethost-client-ip']
      if (customIp) return Array.isArray(customIp) ? customIp[0] : customIp
    }

    return connectingIp
  }

  const ipRateLimiter = new RateLimiterMemory({
    points: 1000,
    duration: 60 * 60,
  })

  const hostnameRateLimiter = new RateLimiterMemory({
    points: 10000,
    duration: 60 * 60,
  })

  // Concurrent request limiters
  const ipConcurrentLimiter = new RateLimiterMemory({
    points: 5,
    duration: 0, // Duration 0 means we manually manage release
  })

  const hostnameConcurrentLimiter = new RateLimiterMemory({
    points: 50,
    duration: 0,
  })

  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const connectingIp = getConnectingIp(req)
    const endClientIp = getClientIp(req)
    const hostname = req.hostname

    const { dbg, warn } = rateLimiterLogger
      .create(hostname)
      .breadcrumb(connectingIp || `unknown`)
      .breadcrumb(endClientIp || `unknown`)

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

    if (isUserProxy(connectingIp)) {
      dbg(`User Proxy IP detected`, req.headers)
    }

    // Check rate limits first (requests per hour per IP per hostname)
    try {
      const key = `${endClientIp}:${hostname}`
      const ipResult = await ipRateLimiter.consume(key)
      dbg(`IP request accepted. Key: ${key}. Points remaining: ${ipResult.remainingPoints}`)
    } catch (rateLimiterRes: any) {
      const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000)
      warn(`IP rate limit exceeded. Retry after ${retryAfter} seconds`)
      res.set('Retry-After', String(retryAfter))
      res.status(429).send(`Too Many Requests: retry after ${retryAfter} seconds [1]`)
      return
    }

    // Check hostname rate limit (requests per hour per hostname)
    try {
      const key = hostname
      const hostnameResult = await hostnameRateLimiter.consume(key)
      dbg(`Hostname request accepted. Key: ${key}. Points remaining: ${hostnameResult.remainingPoints}`)
    } catch (rateLimiterRes: any) {
      const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000)
      warn(`Hostname rate limit exceeded. Retry after ${retryAfter} seconds`)
      res.set('Retry-After', String(retryAfter))
      res.status(429).send(`Too Many Requests: retry after ${retryAfter} seconds [2]`)
      return
    }

    let ipConcurrentConsumed = false
    let hostnameConcurrentConsumed = false

    // Helper to release concurrent points
    const releaseConcurrentPoints = async () => {
      if (ipConcurrentConsumed) {
        const key = `${endClientIp}:${hostname}`
        const ipConcurrentResult = await ipConcurrentLimiter.reward(key, 1)
        dbg(`Released IP concurrent point. Key: ${key}. Points remaining: ${ipConcurrentResult.remainingPoints}`)
      }
      if (hostnameConcurrentConsumed) {
        const key = hostname
        const hostnameConcurrentResult = await hostnameConcurrentLimiter.reward(key, 1)
        dbg(
          `Released hostname concurrent point. Key: ${key}. Points remaining: ${hostnameConcurrentResult.remainingPoints}`
        )
      }
    }

    // Check concurrent limits per IP per hostname
    try {
      const key = `${endClientIp}:${hostname}`
      const ipConcurrentResult = await ipConcurrentLimiter.consume(key)
      dbg(`IP concurrent request accepted. Key: ${key}. Points remaining: ${ipConcurrentResult.remainingPoints}`)
      ipConcurrentConsumed = true
    } catch (rateLimiterRes: any) {
      warn(`IP concurrent limit exceeded.`)
      res.status(429).send(`Too Many Requests: concurrent request limit exceeded [3]`)
      return
    }

    // Check overall concurrent limits per host
    try {
      const key = hostname
      const hostnameConcurrentResult = await hostnameConcurrentLimiter.consume(key)
      dbg(
        `Hostname concurrent request accepted. Key: ${key}. Points remaining: ${hostnameConcurrentResult.remainingPoints}`
      )
      hostnameConcurrentConsumed = true
    } catch (rateLimiterRes: any) {
      await releaseConcurrentPoints()
      warn(`Hostname concurrent limit exceeded.`)
      res.status(429).send(`Too Many Requests: concurrent request limit exceeded [4]`)
      return
    }

    // Release concurrent points when response finishes
    res.on('finish', releaseConcurrentPoints)
    res.on('close', releaseConcurrentPoints)

    next()
  }
}
