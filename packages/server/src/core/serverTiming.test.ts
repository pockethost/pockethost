import express from 'express'
import http, { type Server } from 'http'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { createProxyServer } from 'httpxy'
import type { AddressInfo } from 'net'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { formatTiming, mergeServerTiming, msSince, serverTimingMiddleware } from './serverTiming'

const listen = (app: http.RequestListener) =>
  new Promise<Server>((resolve) => {
    const s = http.createServer(app).listen(0, '127.0.0.1', () => resolve(s))
  })
const urlOf = (s: Server) => `http://127.0.0.1:${(s.address() as AddressInfo).port}`
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Parses `a;dur=1.0;desc="x", b;dur=2.0` into [{name, dur, desc}]. */
const parse = (header: string | undefined) =>
  (header ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, ...params] = part.split(';')
      const get = (k: string) => params.find((p) => p.startsWith(`${k}=`))?.slice(k.length + 1)
      return { name, dur: Number(get('dur')), desc: get('desc')?.replace(/"/g, '') }
    })

describe('Server-Timing helpers', () => {
  it('formats an entry with one decimal and a quoted desc', () => {
    expect(formatTiming({ name: 'edge', dur: 63.456, desc: 'sfo' })).toBe('edge;dur=63.5;desc="sfo"')
    expect(formatTiming({ name: 'wake', dur: 0 })).toBe('wake;dur=0.0')
  })

  it('strips quotes from desc so the header stays valid', () => {
    expect(formatTiming({ name: 'x', dur: 1, desc: 'a"b\\c' })).toBe('x;dur=1.0;desc="abc"')
  })

  it('appends after upstream entries, whatever shape they arrive in', () => {
    const mine = [{ name: 'entry', dur: 5, desc: 'sfo' }]
    expect(mergeServerTiming(undefined, mine)).toBe('entry;dur=5.0;desc="sfo"')
    expect(mergeServerTiming('origin;dur=1.0', mine)).toBe('origin;dur=1.0, entry;dur=5.0;desc="sfo"')
    expect(mergeServerTiming(['cfL4;desc="x"', 'origin;dur=1.0'], mine)).toBe(
      'cfL4;desc="x", origin;dur=1.0, entry;dur=5.0;desc="sfo"'
    )
  })

  it('never reports negative durations', () => {
    expect(msSince(10, 5)).toBe(0)
  })
})

// origin (PocketBase) <- daemon (httpxy, like ProxyService) <- firewall (http-proxy-middleware, like edgeRouting)
describe('Server-Timing across hops', () => {
  const servers: Server[] = []

  let firewallUrl = ''
  beforeAll(async () => {
    const pocketbase = await listen(async (req, res) => {
      if (req.url === '/upstream-timing') res.setHeader('Server-Timing', 'pb;dur=1.0')
      await sleep(30)
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end('ok')
    })
    servers.push(pocketbase)

    const proxy = createProxyServer({})
    const daemon = express()
    daemon.use(
      serverTimingMiddleware((_req, res, elapsedMs) => {
        const t = (res as express.Response).locals.phTiming as { readyAt?: number } | undefined
        return [
          ...(t?.readyAt !== undefined ? [{ name: 'origin', dur: msSince(t.readyAt) }] : []),
          { name: 'edge', dur: elapsedMs, desc: 'sgp-1' },
        ]
      })
    )
    daemon.get('/local-error', (_req, res) => {
      res.status(503).json({ error: 'starting' })
    })
    daemon.use(async (req, res) => {
      await sleep(20) // stands in for waking the instance
      res.locals.phTiming = { readyAt: performance.now() }
      await proxy.web(req, res, { target: urlOf(pocketbase) })
    })
    const daemonServer = await listen(daemon)
    servers.push(daemonServer)

    const firewall = express()
    firewall.use(serverTimingMiddleware((_req, _res, elapsedMs) => [{ name: 'entry', dur: elapsedMs, desc: 'sfo' }]))
    firewall.use(createProxyMiddleware({ target: urlOf(daemonServer) }))
    const firewallServer = await listen(firewall)
    servers.push(firewallServer)
    firewallUrl = urlOf(firewallServer)
  })

  afterAll(() => {
    for (const s of servers) s.close()
  })

  it('each hop adds its entry after the inner ones, and durations nest', async () => {
    const res = await request(firewallUrl).get('/')
    expect(res.text).toBe('ok')
    const t = parse(res.headers['server-timing'])
    expect(t.map((e) => e.name)).toEqual(['origin', 'edge', 'entry'])
    const [origin, edge, entry] = t
    expect(origin.dur).toBeGreaterThanOrEqual(25)
    expect(edge.dur).toBeGreaterThanOrEqual(origin.dur + 15) // includes the 20 ms wake
    expect(entry.dur).toBeGreaterThanOrEqual(edge.dur)
    expect(edge.desc).toBe('sgp-1')
    expect(entry.desc).toBe('sfo')
  })

  it('keeps what PocketBase itself sent', async () => {
    const res = await request(firewallUrl).get('/upstream-timing')
    expect(parse(res.headers['server-timing']).map((e) => e.name)).toEqual(['pb', 'origin', 'edge', 'entry'])
  })

  it('responses a hop generates itself are timed too', async () => {
    const res = await request(firewallUrl).get('/local-error')
    expect(res.status).toBe(503)
    expect(parse(res.headers['server-timing']).map((e) => e.name)).toEqual(['edge', 'entry'])
  })

  it('a hop that passes headers straight to writeHead is merged, not overwritten', async () => {
    const app = express()
    app.use(serverTimingMiddleware(() => [{ name: 'entry', dur: 1 }]))
    app.use((_req, res) => {
      res.writeHead(200, { 'Server-Timing': 'origin;dur=2.0' })
      res.end()
    })
    const res = await request(app).get('/')
    expect(res.headers['server-timing']).toBe('origin;dur=2.0, entry;dur=1.0')
  })
})
