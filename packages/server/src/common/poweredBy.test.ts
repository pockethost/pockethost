import express from 'express'
import type { Server } from 'http'
import { createProxyMiddleware } from 'http-proxy-middleware'
import type { AddressInfo } from 'net'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { POWERED_BY, poweredByMiddleware } from './expressMiddleware'

// The server that fulfills a request names itself in X-Powered-By; proxies in front pass it through.
describe('X-Powered-By', () => {
  let upstream: Server
  const firewall = express()

  beforeAll(async () => {
    const owner = express()
    owner.disable('x-powered-by')
    owner.get('/pocker', (_req, res) => res.setHeader('X-Powered-By', 'Pocker').send('pocker'))
    owner.get('/none', (_req, res) => res.send('none'))
    upstream = await new Promise<Server>((resolve) => {
      const s = owner.listen(0, '127.0.0.1', () => resolve(s))
    })
    firewall.disable('x-powered-by')
    firewall.use(poweredByMiddleware)
    firewall.get('/api/firewall/health', (_req, res) => res.json({ code: 200 }))
    firewall.use(createProxyMiddleware({ target: `http://127.0.0.1:${(upstream.address() as AddressInfo).port}` }))
  })

  afterAll(() => {
    upstream?.close()
  })

  it('a response the proxy generates itself says PocketHost', async () => {
    const res = await request(firewall).get('/api/firewall/health')
    expect(res.headers['x-powered-by']).toBe(POWERED_BY)
  })

  it("a proxied response keeps the owner's value", async () => {
    const res = await request(firewall).get('/pocker')
    expect(res.text).toBe('pocker')
    expect(res.headers['x-powered-by']).toBe('Pocker')
  })

  it('a proxied response without one gets PocketHost (no Express)', async () => {
    const res = await request(firewall).get('/none')
    expect(res.headers['x-powered-by']).toBe(POWERED_BY)
  })
})
