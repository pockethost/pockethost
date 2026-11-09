import type { Handler, RequestHandler } from 'express'

export const corsMiddleware: RequestHandler = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
  const requestedHeaders = req.headers['access-control-request-headers']
  if (requestedHeaders) {
    res.setHeader('Access-Control-Allow-Headers', requestedHeaders)
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  next()
}

export const enforceHttps: RequestHandler = (req, res, next) => {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    next()
    return
  }
  const host = req.headers.host
  if (!host) {
    next()
    return
  }
  res.redirect(301, `https://${host}${req.originalUrl}`)
}

export function vhost(hostname: string, handler: Handler): Handler {
  return (req, res, next) => {
    const host = req.headers.host?.split(':')[0]
    if (host === hostname) {
      return handler(req, res, next)
    }
    next()
  }
}
