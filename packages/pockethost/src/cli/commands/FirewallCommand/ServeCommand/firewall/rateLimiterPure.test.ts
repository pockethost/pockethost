import type express from 'express'
import { describe, expect, it } from 'vitest'
import {
  consumeWeightForPath,
  getConnectingIp,
  isHealthProbePath,
  isPocketBaseFilesPath,
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
})
