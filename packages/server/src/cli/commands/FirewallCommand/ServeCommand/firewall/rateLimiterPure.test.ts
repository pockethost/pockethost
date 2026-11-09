import type express from 'express'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { describe, expect, it } from 'vitest'
import {
  API_WEIGHT_NUM,
  buildPocketHostRateLimitHeaders,
  consumeWeightForPath,
  getConnectingIp,
  isHealthProbePath,
  isPocketBaseFilesPath,
  microPointsToApiBudget,
  parseInstanceFirewall,
  POCKETHOST_RATE_LIMIT_HEADERS,
  rateLimitResetUnix,
  resolveHourlyLimit,
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

  it('parses instance firewall hourly and concurrent overrides', () => {
    expect(parseInstanceFirewall({ instance_hourly: 20000 })).toEqual({ instance_hourly: 20000 })
    expect(parseInstanceFirewall({ ip_hourly: 2000, instance_hourly: 50000 })).toEqual({
      ip_hourly: 2000,
      instance_hourly: 50000,
    })
    expect(parseInstanceFirewall({ instance_concurrent: 500, ip_concurrent: 40 })).toEqual({
      instance_concurrent: 500,
      ip_concurrent: 40,
    })
    expect(parseInstanceFirewall('{"instance_hourly":20000}')).toEqual({ instance_hourly: 20000 })
    expect(parseInstanceFirewall({ instance_hourly: 0, ip_hourly: -1, instance_concurrent: 0 })).toEqual({})
    expect(parseInstanceFirewall({ instance_hourly: '20000' })).toEqual({})
    expect(parseInstanceFirewall(null)).toEqual({})
  })

  it('resolves hourly limits with trusted floor', () => {
    expect(resolveHourlyLimit(undefined, 10000, 20000, false)).toBe(10000)
    expect(resolveHourlyLimit(undefined, 10000, 20000, true)).toBe(20000)
    expect(resolveHourlyLimit(20000, 10000, 20000, false)).toBe(20000)
    expect(resolveHourlyLimit(50000, 10000, 20000, true)).toBe(50000)
    expect(resolveHourlyLimit(5000, 10000, 20000, true)).toBe(20000)
  })

  it('rejected duration-0 consume charges points until rewarded', async () => {
    const limiter = new RateLimiterMemory(toMicroPointLimit({ points: 1, duration: 0 }))
    const key = 'host'
    await limiter.consume(key, API_WEIGHT_NUM)
    await expect(limiter.consume(key, API_WEIGHT_NUM)).rejects.toMatchObject({ consumedPoints: 20 })
    expect((await limiter.get(key))?.consumedPoints).toBe(20)
    await limiter.reward(key, API_WEIGHT_NUM)
    expect((await limiter.get(key))?.consumedPoints).toBe(10)
  })
})
