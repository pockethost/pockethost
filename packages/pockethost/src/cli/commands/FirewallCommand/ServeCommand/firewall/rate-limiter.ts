import express from 'express'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { Logger } from 'src/common'

const getClientIp = (req: express.Request): string | undefined => {
  const cf = req.headers['cf-connecting-ip'] || req.headers['true-client-ip']
  if (cf) return Array.isArray(cf) ? cf[0] : cf

  const xff = req.headers['x-forwarded-for']
  const xffStr = Array.isArray(xff) ? xff.join(',') : xff
  if (typeof xffStr === 'string') {
    const ip = xffStr.split(',')?.[0]?.trim()
    if (ip) return ip
  }

  const xri = req.headers['x-real-ip']
  if (xri) return Array.isArray(xri) ? xri[0] : xri

  return req.ip || req.socket?.remoteAddress
}

// Middleware factory to create a rate limiting middleware
export const createRateLimiterMiddleware = (logger: Logger) => {
  const { dbg, warn } = logger.create(`RateLimiter`)
  dbg(`Creating`)

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
    const ip = getClientIp(req)
    if (!ip) {
      warn(`Could not determine IP address`)
      return next()
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
