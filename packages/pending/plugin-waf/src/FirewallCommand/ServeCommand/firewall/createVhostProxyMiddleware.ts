import { createProxyMiddleware } from 'http-proxy-middleware'
import { Request } from 'pockethost/core'
import vhost from 'vhost'

export function createVhostProxyMiddleware(
  host: string,
  target: string,
  ws = false,
) {
  console.log(`Creating ${host}->${target}`)
  const handler = createProxyMiddleware({ target, ws, changeOrigin: ws })
  return vhost(host, (_req, res, next) => {
    const req = _req as unknown as Request
    const method = req.method
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl

    console.log(`${method} ${fullUrl} -> ${target}`)
    // @ts-ignore
    return handler(req, res, next)
  })
}
