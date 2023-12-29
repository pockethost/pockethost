import { DAEMON_PORT } from '$constants'
import {
  Logger,
  LoggerService,
  SingletonBaseConfig,
  mkSingleton,
} from '$shared'
import { asyncExitHook } from '$util'
import cors from 'cors'
import express, { Request, Response } from 'express'
import { default as Server, default as httpProxy } from 'http-proxy'
import { AsyncReturnType } from 'type-fest'

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

  server.use((req, res, next) => {
    const host = req.headers.host
    if (!host) {
      throw new Error(`Host not found`)
    }
    res.locals.host = host
    next()
  })

  server.use((req, res, next) => {
    res.locals.coreInternalUrl = coreInternalUrl
    next()
  })

  server.use((req, res, next) => {
    const url = new URL(`http://${req.headers.host}${req.url}`)
    const country = (req.headers['cf-ipcountry'] as string) || '<ct>'
    const ip = (req.headers['x-forwarded-for'] as string) || '<ip>'
    const method = req.method || '<m>'
    const sig = [
      method.padStart(10),
      country.padStart(5),
      ip.padEnd(45),
      url.toString(),
    ].join(' ')
    info(`Incoming request ${sig}`)
    res.locals.sig = sig
    next()
  })

  server.use((req, res, next) => {
    res.locals.proxy = proxy
    next()
  })

  server.use((req, res, next) => {
    res.locals.proxy = proxy
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
