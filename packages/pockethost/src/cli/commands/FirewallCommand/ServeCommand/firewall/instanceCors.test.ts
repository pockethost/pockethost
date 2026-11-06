import { corsMiddleware } from '@'
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import type { AddressInfo } from 'net'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  createInstanceCorsMiddleware,
  parseCorsOrigins,
  resolveAllowOrigin,
  rewriteProxiedCorsHeaders,
} from './instanceCors'

describe('parseCorsOrigins', () => {
  it('splits, trims and dedupes', () => {
    expect(parseCorsOrigins(' https://a.test , https://b.test,,https://a.test ')).toEqual([
      'https://a.test',
      'https://b.test',
    ])
  })

  it('returns null for empty or missing values', () => {
    expect(parseCorsOrigins('')).toBeNull()
    expect(parseCorsOrigins(' , ')).toBeNull()
    expect(parseCorsOrigins(undefined)).toBeNull()
  })

  it('does not validate entries', () => {
    expect(parseCorsOrigins('not a url')).toEqual(['not a url'])
  })
})

describe('resolveAllowOrigin (PocketBase semantics)', () => {
  const list = ['https://a.test', 'https://*.b.test', 'http://localhost:517?']

  it('echoes an exact match', () => {
    expect(resolveAllowOrigin(list, 'https://a.test')).toBe('https://a.test')
  })

  it('rejects anything else', () => {
    expect(resolveAllowOrigin(list, 'https://evil.test')).toBeNull()
    expect(resolveAllowOrigin(list, 'https://a.test.evil.test')).toBeNull()
    expect(resolveAllowOrigin(list, 'http://a.test')).toBeNull()
  })

  it('supports * and ? wildcards', () => {
    expect(resolveAllowOrigin(list, 'https://x.b.test')).toBe('https://x.b.test')
    expect(resolveAllowOrigin(list, 'http://localhost:5173')).toBe('http://localhost:5173')
    expect(resolveAllowOrigin(list, 'https://b.test')).toBeNull()
  })

  it('treats a lone * as allow-all', () => {
    expect(resolveAllowOrigin(['*'], 'https://anything.test')).toBe('*')
  })

  it('returns null without an Origin', () => {
    expect(resolveAllowOrigin(list, undefined)).toBeNull()
  })
})

/**
 * End to end through a real proxy: firewall (instance CORS + HPM with the rewrite hook) -> fake daemon that, like the
 * real one, runs `corsMiddleware` (ACAO *) and optionally a PocketBase-style ACAO of its own.
 */
describe('firewall instance CORS end to end', () => {
  const daemon = express()
  daemon.use(corsMiddleware)
  daemon.get('/pb-own-cors', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Vary', 'Accept-Encoding')
    res.send('pb')
  })
  daemon.get('/{*path}', (_req, res) => {
    res.send('ok')
  })
  let daemonServer: ReturnType<typeof daemon.listen>
  let firewall: express.Express
  let daemonHits = 0

  const SECRETS: Record<string, Record<string, string>> = {
    'open.test': {},
    'locked.test': { PH_CORS_ORIGINS: 'https://good.test, https://*.good.test' },
    'star.test': { PH_CORS_ORIGINS: '*' },
  }

  beforeAll(async () => {
    daemonServer = daemon.listen(0)
    await new Promise((r) => daemonServer.once('listening', r))
    const port = (daemonServer.address() as AddressInfo).port
    daemonServer.on('request', () => daemonHits++)

    firewall = express()
    firewall.use(
      createInstanceCorsMiddleware({
        getInstanceSecrets: async (host) => SECRETS[host] ?? null,
      })
    )
    firewall.get('/api/firewall/health', (_req, res) => {
      res.json({ code: 200 })
    })
    firewall.get('/blocked', (_req, res) => {
      res.status(429).send('Too many requests')
    })
    firewall.use(
      createProxyMiddleware({
        target: `http://127.0.0.1:${port}`,
        on: { proxyRes: (proxyRes, _req, res) => rewriteProxiedCorsHeaders(proxyRes, res as express.Response) },
      })
    )
  })

  afterAll(() => {
    daemonServer?.close()
  })

  const preflight = (host: string, origin: string, path = '/api/collections/x/records') =>
    request(firewall)
      .options(path)
      .set('Host', host)
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type')

  it('no secret: identical to the old blanket corsMiddleware', async () => {
    const before = daemonHits
    const pre = await preflight('open.test', 'https://evil.test')
    expect(pre.status).toBe(204)
    expect(pre.headers['access-control-allow-origin']).toBe('*')
    expect(pre.headers['access-control-allow-headers']).toBe('authorization,content-type')
    expect(daemonHits).toBe(before)

    const get = await request(firewall).get('/x').set('Host', 'open.test').set('Origin', 'https://evil.test')
    expect(get.status).toBe(200)
    expect(get.headers['access-control-allow-origin']).toBe('*')
  })

  it('unknown host: permissive as today', async () => {
    const pre = await preflight('unknown.test', 'https://evil.test')
    expect(pre.status).toBe(204)
    expect(pre.headers['access-control-allow-origin']).toBe('*')
  })

  it('allowed origin: preflight answered at the firewall with the origin echoed', async () => {
    const before = daemonHits
    const pre = await preflight('locked.test', 'https://good.test')
    expect(pre.status).toBe(204)
    expect(pre.headers['access-control-allow-origin']).toBe('https://good.test')
    expect(pre.headers['access-control-allow-methods']).toBe('GET,HEAD,PUT,PATCH,POST,DELETE')
    expect(pre.headers['access-control-allow-headers']).toBe('authorization,content-type')
    expect(pre.headers['vary']).toContain('Origin')
    expect(daemonHits).toBe(before)
  })

  it('wildcard entry: echoes the matching origin', async () => {
    const pre = await preflight('locked.test', 'https://app.good.test')
    expect(pre.headers['access-control-allow-origin']).toBe('https://app.good.test')
  })

  it('rejected origin: 204 preflight without CORS headers, never reaches the daemon', async () => {
    const before = daemonHits
    const pre = await preflight('locked.test', 'https://evil.test')
    expect(pre.status).toBe(204)
    expect(pre.headers['access-control-allow-origin']).toBeUndefined()
    expect(pre.headers['access-control-allow-methods']).toBeUndefined()
    expect(pre.headers['access-control-allow-headers']).toBeUndefined()
    expect(daemonHits).toBe(before)
  })

  it('allowed origin: proxied response carries only the firewall value', async () => {
    const before = daemonHits
    const res = await request(firewall).get('/x').set('Host', 'locked.test').set('Origin', 'https://good.test')
    expect(res.status).toBe(200)
    expect(res.text).toBe('ok')
    expect(res.headers['access-control-allow-origin']).toBe('https://good.test')
    expect(res.headers['access-control-allow-methods']).toBeUndefined()
    expect(daemonHits).toBe(before + 1)
  })

  it("rejected origin: the daemon's * and PocketBase's own header are stripped", async () => {
    const a = await request(firewall).get('/x').set('Host', 'locked.test').set('Origin', 'https://evil.test')
    expect(a.status).toBe(200)
    expect(a.headers['access-control-allow-origin']).toBeUndefined()

    const b = await request(firewall).get('/pb-own-cors').set('Host', 'locked.test').set('Origin', 'https://evil.test')
    expect(b.text).toBe('pb')
    expect(b.headers['access-control-allow-origin']).toBeUndefined()
    expect(b.headers['vary']).toBe('Accept-Encoding, Origin')
  })

  it('firewall-generated responses follow the policy', async () => {
    const good = await request(firewall).get('/blocked').set('Host', 'locked.test').set('Origin', 'https://good.test')
    expect(good.status).toBe(429)
    expect(good.headers['access-control-allow-origin']).toBe('https://good.test')

    const evil = await request(firewall).get('/blocked').set('Host', 'locked.test').set('Origin', 'https://evil.test')
    expect(evil.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('firewall routes stay permissive on locked instances (dashboard custom-domain check)', async () => {
    const res = await request(firewall)
      .get('/api/firewall/health')
      .set('Host', 'locked.test')
      .set('Origin', 'https://pockethost.io')
    expect(res.headers['access-control-allow-origin']).toBe('*')
  })

  it('edge routes stay permissive on locked instances (dashboard log stream)', async () => {
    for (const path of ['/logs', '/_api/daemon/health']) {
      const pre = await preflight('locked.test', 'https://pockethost.io', path)
      expect(pre.status).toBe(204)
      expect(pre.headers['access-control-allow-origin']).toBe('*')
    }
    const post = await request(firewall).get('/logs').set('Host', 'locked.test').set('Origin', 'https://pockethost.io')
    expect(post.headers['access-control-allow-origin']).toBe('*')
  })

  it('* in the secret behaves like allow-all', async () => {
    const res = await request(firewall).get('/x').set('Host', 'star.test').set('Origin', 'https://evil.test')
    expect(res.headers['access-control-allow-origin']).toBe('*')
  })

  it('requests without Origin are untouched apart from CORS headers', async () => {
    const res = await request(firewall).get('/x').set('Host', 'locked.test')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})
