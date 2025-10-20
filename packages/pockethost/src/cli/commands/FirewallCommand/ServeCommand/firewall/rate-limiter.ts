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
  const { dbg, warn } = logger.create(`RateLimiter`)
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

    // Check if connecting IP is whitelisted - bypass all rate limiting
    if (connectingIp && userProxyWhitelistIps.includes(connectingIp)) {
      dbg(`Whitelisted user proxy IP detected: ${connectingIp} - bypassing rate limiting`)
      return next()
    }

    if (isUserProxy(connectingIp)) {
      dbg(`User Proxy IP detected: ${connectingIp}`, req.headers)
    }

    const ip = getClientIp(req)
    if (!ip) {
      warn(`Could not determine IP address`)
      res.status(429).send(`IP address not found`)
      return
    }

    const hostname = req.hostname
    // dbg(`Request from ${ip} for host ${hostname}`)

    // Check rate limits first (requests per hour)
    try {
      const ipResult = await ipRateLimiter.consume(ip)
      dbg(`IP points remaining for ${ip}: ${ipResult.remainingPoints}`)
    } catch (rateLimiterRes: any) {
      const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000)
      warn(`IP rate limit exceeded for ${ip} on host ${hostname}. Retry after ${retryAfter} seconds`)
      res.set('Retry-After', String(retryAfter))
      res.status(429).send(`Too Many Requests: retry after ${retryAfter} seconds [1]`)
      return
    }

    try {
      const hostnameResult = await hostnameRateLimiter.consume(hostname)
      dbg(`Hostname points remaining for ${hostname}: ${hostnameResult.remainingPoints}`)
    } catch (rateLimiterRes: any) {
      const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000)
      warn(`Hostname rate limit exceeded for ${hostname} by IP ${ip}. Retry after ${retryAfter} seconds`)
      res.set('Retry-After', String(retryAfter))
      res.status(429).send(`Too Many Requests: retry after ${retryAfter} seconds [2]`)
      return
    }

    let ipConcurrentConsumed = false
    let hostnameConcurrentConsumed = false

    // Helper to release concurrent points
    const releaseConcurrentPoints = async () => {
      if (ipConcurrentConsumed) {
        const ipConcurrentResult = await ipConcurrentLimiter.reward(ip, 1)
        dbg(`Released concurrent point for IP ${ip}. Points remaining: ${ipConcurrentResult.remainingPoints}`)
      }
      if (hostnameConcurrentConsumed) {
        const hostnameConcurrentResult = await hostnameConcurrentLimiter.reward(hostname, 1)
        dbg(
          `Released concurrent point for hostname ${hostname}. Points remaining: ${hostnameConcurrentResult.remainingPoints}`
        )
      }
    }

    // Check concurrent limits
    try {
      const ipConcurrentResult = await ipConcurrentLimiter.consume(ip)
      ipConcurrentConsumed = true
      dbg(`IP concurrent request accepted for ${ip}. Points remaining: ${ipConcurrentResult.remainingPoints}`)
    } catch (rateLimiterRes: any) {
      warn(`IP concurrent limit exceeded for ${ip} on host ${hostname}`)
      res.status(429).send(`Too Many Requests: concurrent request limit exceeded [3]`)
      return
    }

    try {
      const hostnameConcurrentResult = await hostnameConcurrentLimiter.consume(hostname)
      hostnameConcurrentConsumed = true
      dbg(
        `Hostname concurrent request accepted for ${hostname} on IP ${ip}. Points remaining: ${hostnameConcurrentResult.remainingPoints}`
      )
    } catch (rateLimiterRes: any) {
      await releaseConcurrentPoints()
      warn(`Hostname concurrent limit exceeded for ${hostname} by IP ${ip}`)
      res.status(429).send(`Too Many Requests: concurrent request limit exceeded [4]`)
      return
    }

    // Release concurrent points when response finishes
    res.on('finish', releaseConcurrentPoints)
    res.on('close', releaseConcurrentPoints)

    next()
  }
}
