import express from 'express'
import { LoggerService } from 'src/common'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
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
})
