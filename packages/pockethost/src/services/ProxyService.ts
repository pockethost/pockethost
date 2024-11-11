import cors from 'cors'
import express, { Request, Response } from 'express'
import 'express-async-errors'
import { default as Server, default as httpProxy } from 'http-proxy'
import { AsyncReturnType } from 'type-fest'
import {
  DAEMON_PORT,
  EDGE_SASS_DOMAINS_AUTH_TOKEN,
  Logger,
  LoggerService,
  SingletonBaseConfig,
  asyncExitHook,
  mkSingleton,
  seqid,
} from '../../core'

export type ProxyServiceApi = AsyncReturnType<typeof proxyService>

export type ProxyMiddleware = (
  req: Request,
  res: Response,
  meta: {
    subdomain: string
    coreInternalUrl: string
    proxy: Server
    host: string
  },
  logger: Logger,
) => boolean | Promise<boolean>

export type ProxyServiceConfig = SingletonBaseConfig & {
  coreInternalUrl: string
}
export const proxyService = mkSingleton(async (config: ProxyServiceConfig) => {
  const _proxyLogger = LoggerService().create('ProxyService')
  const { dbg, error, info, trace, warn } = _proxyLogger

  const { coreInternalUrl } = config

  const proxy = httpProxy.createProxyServer({})
  proxy.on('error', (err, req, res, target) => {
    warn(`Proxy error ${err} on ${req.url} (${req.headers.host})`)
  })

  const server = express()

  server.use(cors())

  server.get('/_api/health', (req, res, next) => {
    res.json({ status: 'ok' })
    res.end
  })

  // Default locals
  server.use((req, res, next) => {
    const host = req.headers.host
    res.locals.host = host
    res.locals.coreInternalUrl = coreInternalUrl
    next()
  })

  // Cloudflare signature
  server.use((req, res, next) => {
    const url = new URL(`https://${res.locals.host}${req.url}`)
    const country = (req.headers['cf-ipcountry'] as string) || '<ct>'
    const ip = (req.headers['x-forwarded-for'] as string) || '<ip>'
    const method = req.method || '<m>'
    const sig = [
      seqid(),
      method.padStart(10),
      country.padStart(5),
      ip.padEnd(45),
      url.toString(),
    ].join(' ')
    res.locals.sig = sig
    next()
  })

  // SaaS domains overrides
  server.use((req, res, next) => {
    if (!(`x-saas-domains-auth-token` in req.headers)) {
      next()
      return
    }

    const secret = EDGE_SASS_DOMAINS_AUTH_TOKEN()
    if (req.headers[`x-saas-domains-auth-token`] !== secret) {
      throw new Error(`Invalid SaaS domain secret`)
    }

    const host = req.headers[`x-served-for`]
    res.locals.host = host

    const url = new URL(`https://${host}${req.url}`)
    const country =
      (req.headers['x-saas-geoip-country-code'] as string) || '<ct>'
    const ip = (req.headers['x-saas-domains-ip'] as string) || '<ip>'
    const method = req.method || '<m>'
    const sig = [
      method.padStart(10),
      country.padStart(5),
      ip.padEnd(45),
      url.toString(),
    ].join(' ')
    res.locals.sig = sig
    next()
  })

  server.use((req, res, next) => {
    res.locals.proxy = proxy
    next()
  })

  // Request logging
  server.use((req, res, next) => {
    if (!res.locals.host) {
      throw new Error(`Host not found`)
    }
    next()
  })

  server.use((req, res, next) => {
    info(`Incoming request ${res.locals.sig}`)
    next()
  })

  server.listen(DAEMON_PORT(), () => {
    info(`daemon listening on port ${DAEMON_PORT()}`)
  })

  asyncExitHook(async () => {
    info(`Shutting down proxy server`)
  })

  const use = server.use.bind(server)

  return { use }
})
