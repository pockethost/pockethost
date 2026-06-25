import type express from 'express'
import { describe, expect, it } from 'vitest'
import {
  buildPocketHostRateLimitHeaders,
  consumeWeightForPath,
  getConnectingIp,
  isHealthProbePath,
  isPocketBaseFilesPath,
  microPointsToApiBudget,
  POCKETHOST_RATE_LIMIT_HEADERS,
  rateLimitResetUnix,
  toMicroPointLimit,
  toProxyCidrString,
  WEIGHT_DEN,
} from './rateLimiterPure'

const mockReq = (headers: Record<string, string | string[]>, ip = '127.0.0.1'): express.Request =>
  ({
    headers,
    ip,
    socket: { remoteAddress: ip },
  }) as express.Request

describe('rateLimiterPure', () => {
  it('normalizes proxy CIDR strings', () => {
    expect(toProxyCidrString('203.0.113.1')).toBe('203.0.113.1/32')
    expect(toProxyCidrString('10.0.0.0/8')).toBe('10.0.0.0/8')
  })

  it('getConnectingIp prefers Cloudflare headers', () => {
    expect(getConnectingIp(mockReq({ 'cf-connecting-ip': '1.2.3.4' }))).toBe('1.2.3.4')
    expect(getConnectingIp(mockReq({ 'x-forwarded-for': '5.6.7.8, 9.9.9.9' }))).toBe('5.6.7.8')
    expect(getConnectingIp(mockReq({ 'x-real-ip': '8.8.8.8' }))).toBe('8.8.8.8')
  })

  it('classifies health probe paths', () => {
    expect(isHealthProbePath('/api/firewall/health')).toBe(true)
    expect(isHealthProbePath('/_api/daemon/health')).toBe(true)
    expect(isHealthProbePath('/api/collections')).toBe(false)
  })

  it('applies lower weight for file routes', () => {
    expect(isPocketBaseFilesPath('/api/files/x/y')).toBe(true)
    expect(consumeWeightForPath('/api/files/x')).toBeLessThan(consumeWeightForPath('/api/collections'))
    expect(toMicroPointLimit({ points: 1000, duration: 3600 }).points).toBe(1000 * WEIGHT_DEN)
  })

  it('builds PocketHost rate limit response headers', () => {
    const nowMs = 1_700_000_000_000
    expect(microPointsToApiBudget(9990)).toBe(999)
    expect(rateLimitResetUnix(42_000, nowMs)).toBe(Math.ceil(nowMs / 1000 + 42))

    const headers = buildPocketHostRateLimitHeaders([
      {
        scope: 'ip-hourly',
        limitPoints: 1000,
        remainingMicroPoints: 5000,
        msBeforeNext: 3600_000,
      },
      {
        scope: 'instance-concurrent',
        limitPoints: 250,
        remainingMicroPoints: 2400,
      },
    ])

    expect(headers[POCKETHOST_RATE_LIMIT_HEADERS.ipHourlyLimit]).toBe('1000')
    expect(headers[POCKETHOST_RATE_LIMIT_HEADERS.ipHourlyRemaining]).toBe('500')
    expect(Number(headers[POCKETHOST_RATE_LIMIT_HEADERS.ipHourlyReset])).toBeGreaterThan(1_700_000_000)
    expect(headers[POCKETHOST_RATE_LIMIT_HEADERS.instanceConcurrentLimit]).toBe('250')
    expect(headers[POCKETHOST_RATE_LIMIT_HEADERS.instanceConcurrentRemaining]).toBe('240')
    expect(headers[POCKETHOST_RATE_LIMIT_HEADERS.instanceHourlyReset]).toBeUndefined()
  })
})
