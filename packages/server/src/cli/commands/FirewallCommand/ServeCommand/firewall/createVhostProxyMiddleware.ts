import { Logger, vhost } from '@'
import type { Handler, Request } from 'express'
import type { IncomingMessage } from 'http'
import { createProxyMiddleware } from 'http-proxy-middleware'
import type { Socket } from 'net'

export type VhostUpgradeHandler = (req: IncomingMessage, socket: Socket, head: Buffer) => boolean

export type VhostProxyMiddleware = {
  middleware: Handler
  upgrade?: VhostUpgradeHandler
}

export function createVhostProxyMiddleware(
  host: string,
  target: string,
  ws = false,
  logger: Logger
): VhostProxyMiddleware {
  const { dbg } = logger
  dbg(`Creating ${host}->${target}`)
  // ws must stay false here so HPM does not attach duplicate server "upgrade" listeners.
  // Dev WebSocket upgrades are routed explicitly in firewall/server.ts by Host header.
  const handler = createProxyMiddleware({ target, ws: false, changeOrigin: true })
  const middleware = vhost(host, (_req, res, next) => {
    const req = _req as unknown as Request
    const method = req.method
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl

    dbg(`${method} ${fullUrl} -> ${target}`)
    // @ts-ignore
    return handler(req, res, next)
  })

  if (!ws) {
    return { middleware }
  }

  const upgrade: VhostUpgradeHandler = (req, socket, head) => {
    const reqHost = req.headers.host?.split(':')[0]
    if (reqHost !== host) {
      return false
    }
    dbg(`WS ${reqHost}${req.url} -> ${target}`)
    handler.upgrade(req, socket, head)
    return true
  }

  return { middleware, upgrade }
}
