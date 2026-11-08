import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { daemonRequest } from './daemonRequest'

let server: http.Server | undefined

const listen = (handler: http.RequestListener) =>
  new Promise<number>((resolve) => {
    server = http.createServer(handler)
    server.listen(0, '127.0.0.1', () => resolve((server!.address() as AddressInfo).port))
  })

afterEach(() => {
  server?.closeAllConnections()
  server?.close()
  server = undefined
})

describe('daemonRequest', () => {
  it('sends the instance hostname as Host and returns status and body', async () => {
    const port = await listen((req, res) => {
      res.statusCode = 201
      res.end(`${req.headers.host} ${req.url}`)
    })
    const r = await daemonRequest({ port, host: 'foo.pockethost.io', path: '/api/job?x=1', timeoutMs: 5000 })
    expect(r).toEqual({ status: 201, body: 'foo.pockethost.io /api/job?x=1' })
  })

  it('waits for slow responses within the timeout', async () => {
    const port = await listen((_req, res) => {
      setTimeout(() => res.end('done'), 300)
    })
    const r = await daemonRequest({ port, host: 'foo.pockethost.io', path: '/', timeoutMs: 5000 })
    expect(r.body).toBe('done')
  })

  it('rejects when the response takes longer than the timeout', async () => {
    const port = await listen(() => {
      // never responds
    })
    await expect(daemonRequest({ port, host: 'foo.pockethost.io', path: '/', timeoutMs: 200 })).rejects.toThrow(
      /timed out/
    )
  })

  it('rejects when nothing is listening', async () => {
    const port = await listen(() => {})
    server!.close()
    await new Promise((r) => setTimeout(r, 50))
    await expect(daemonRequest({ port, host: 'foo.pockethost.io', path: '/', timeoutMs: 1000 })).rejects.toThrow()
  })
})
