import express from 'express'
import { LoggerService } from 'src/common'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createRateLimiterMiddleware } from './rate-limiter'

describe('createRateLimiterMiddleware', () => {
  it('bypasses health probe paths', async () => {
    const app = express()
    app.use(createRateLimiterMiddleware(LoggerService()))
    app.get('/api/firewall/health', (_req, res) => {
      res.status(200).send('ok')
    })

    const res = await request(app).get('/api/firewall/health').set('Host', 'app.example.com')
    expect(res.status).toBe(200)
    expect(res.text).toBe('ok')
  })

  it('allows requests with a valid Host header', async () => {
    const app = express()
    app.use(createRateLimiterMiddleware(LoggerService()))
    app.get('/api/test', (_req, res) => {
      res.status(200).send('ok')
    })

    const res = await request(app).get('/api/test').set('Host', 'example.com')
    expect(res.status).toBe(200)
  })

  it('uses X-PocketHost-Client-IP when connecting IP is trusted', async () => {
    const app = express()
    app.use(
      createRateLimiterMiddleware(LoggerService(), {
        isTrustedConnectingIp: vi.fn(async (ip) => ip === '10.0.0.1'),
      })
    )
    app.get('/api/test', (_req, res) => {
      res.status(200).send('ok')
    })

    const trustedRes = await request(app)
      .get('/api/test')
      .set('Host', 'app.example.com')
      .set('X-Forwarded-For', '10.0.0.1')
      .set('X-PocketHost-Client-IP', '203.0.113.10')
    expect(trustedRes.status).toBe(200)

    const spoofRes = await request(app)
      .get('/api/test')
      .set('Host', 'app.example.com')
      .set('X-Forwarded-For', '10.0.0.2')
      .set('X-PocketHost-Client-IP', '203.0.113.10')
    expect(spoofRes.status).toBe(200)
  })
})
