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

  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = getClientIp(req)
    if (!ip) {
      warn(`Could not determine IP address`)
      return next()
    }

    const hostname = req.hostname
    // dbg(`Request from ${ip} for host ${hostname}`)

    try {
      const ipResult = await ipRateLimiter.consume(ip)
      dbg(`IP points remaining for ${ip}: ${ipResult.remainingPoints}`)
    } catch (rateLimiterRes: any) {
      const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000)
      warn(`IP rate limit exceeded for ${ip} on host ${hostname}. Retry after ${retryAfter} seconds`)
      res.set('Retry-After', String(retryAfter))
      res.status(429).send(`Too Many Requests: retry after ${retryAfter} seconds`)
      return
    }

    try {
      const hostnameResult = await hostnameRateLimiter.consume(hostname)
      dbg(`Hostname points remaining for ${hostname}: ${hostnameResult.remainingPoints}`)
      next()
    } catch (rateLimiterRes: any) {
      const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000)
      warn(`Hostname rate limit exceeded for ${hostname} by IP ${ip}. Retry after ${retryAfter} seconds`)
      res.set('Retry-After', String(retryAfter))
      res.status(429).send(`Too Many Requests: retry after ${retryAfter} seconds`)
    }
  }
}
