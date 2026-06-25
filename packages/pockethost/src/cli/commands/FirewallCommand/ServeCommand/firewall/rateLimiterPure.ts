import type express from 'express'
import { isIPv4, isIPv6 } from 'node:net'

export const WEIGHT_DEN = 10
export const FILES_WEIGHT_NUM = 1
export const API_WEIGHT_NUM = WEIGHT_DEN

export const toProxyCidrString = (entry: string): string => {
  if (entry.includes('/')) return entry
  if (isIPv4(entry)) return `${entry}/32`
  if (isIPv6(entry)) return `${entry}/128`
  return entry
}

export const getConnectingIp = (req: express.Request): string | undefined => {
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

export const isPocketBaseFilesPath = (path: string): boolean => path === '/api/files' || path.startsWith('/api/files/')

export const isHealthProbePath = (path: string): boolean =>
  path === '/api/firewall/health' || path === '/_api/daemon/health' || path.startsWith('/_api/daemon/vacuum')

export const toMicroPointLimit = (cfg: { points: number; duration: number }) => ({
  points: cfg.points * WEIGHT_DEN,
  duration: cfg.duration,
})

export const consumeWeightForPath = (path: string): number =>
  isPocketBaseFilesPath(path) ? FILES_WEIGHT_NUM : API_WEIGHT_NUM

/** API-request budget from internal micro-points (see WEIGHT_DEN). */
export const microPointsToApiBudget = (microPoints: number): number => Math.floor(microPoints / WEIGHT_DEN)

export const rateLimitResetUnix = (msBeforeNext: number, nowMs = Date.now()): number =>
  Math.ceil(nowMs / 1000 + msBeforeNext / 1000)

export const POCKETHOST_RATE_LIMIT_HEADERS = {
  ipHourlyLimit: 'X-PocketHost-RateLimit-Ip-Hourly-Limit',
  ipHourlyRemaining: 'X-PocketHost-RateLimit-Ip-Hourly-Remaining',
  ipHourlyReset: 'X-PocketHost-RateLimit-Ip-Hourly-Reset',
  instanceHourlyLimit: 'X-PocketHost-RateLimit-Instance-Hourly-Limit',
  instanceHourlyRemaining: 'X-PocketHost-RateLimit-Instance-Hourly-Remaining',
  instanceHourlyReset: 'X-PocketHost-RateLimit-Instance-Hourly-Reset',
  ipConcurrentLimit: 'X-PocketHost-RateLimit-Ip-Concurrent-Limit',
  ipConcurrentRemaining: 'X-PocketHost-RateLimit-Ip-Concurrent-Remaining',
  instanceConcurrentLimit: 'X-PocketHost-RateLimit-Instance-Concurrent-Limit',
  instanceConcurrentRemaining: 'X-PocketHost-RateLimit-Instance-Concurrent-Remaining',
} as const

export const POCKETHOST_RATE_LIMIT_EXPOSE_HEADERS = Object.values(POCKETHOST_RATE_LIMIT_HEADERS)

export type RateLimitHeaderBucket = {
  scope: 'ip-hourly' | 'instance-hourly' | 'ip-concurrent' | 'instance-concurrent'
  limitPoints: number
  remainingMicroPoints: number
  msBeforeNext?: number
}

export const buildPocketHostRateLimitHeaders = (buckets: RateLimitHeaderBucket[]): Record<string, string> => {
  const headers: Record<string, string> = {}

  for (const bucket of buckets) {
    const remaining = String(microPointsToApiBudget(bucket.remainingMicroPoints))
    const limit = String(bucket.limitPoints)

    switch (bucket.scope) {
      case 'ip-hourly':
        headers[POCKETHOST_RATE_LIMIT_HEADERS.ipHourlyLimit] = limit
        headers[POCKETHOST_RATE_LIMIT_HEADERS.ipHourlyRemaining] = remaining
        if (bucket.msBeforeNext != null) {
          headers[POCKETHOST_RATE_LIMIT_HEADERS.ipHourlyReset] = String(rateLimitResetUnix(bucket.msBeforeNext))
        }
        break
      case 'instance-hourly':
        headers[POCKETHOST_RATE_LIMIT_HEADERS.instanceHourlyLimit] = limit
        headers[POCKETHOST_RATE_LIMIT_HEADERS.instanceHourlyRemaining] = remaining
        if (bucket.msBeforeNext != null) {
          headers[POCKETHOST_RATE_LIMIT_HEADERS.instanceHourlyReset] = String(rateLimitResetUnix(bucket.msBeforeNext))
        }
        break
      case 'ip-concurrent':
        headers[POCKETHOST_RATE_LIMIT_HEADERS.ipConcurrentLimit] = limit
        headers[POCKETHOST_RATE_LIMIT_HEADERS.ipConcurrentRemaining] = remaining
        break
      case 'instance-concurrent':
        headers[POCKETHOST_RATE_LIMIT_HEADERS.instanceConcurrentLimit] = limit
        headers[POCKETHOST_RATE_LIMIT_HEADERS.instanceConcurrentRemaining] = remaining
        break
    }
  }

  return headers
}
