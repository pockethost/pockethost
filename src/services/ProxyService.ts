import { DAEMON_PORT } from '$constants'
import {
  Logger,
  LoggerService,
  SingletonBaseConfig,
  mkSingleton,
} from '$shared'
import { asyncExitHook } from '$util'
import express, { Request, RequestHandler, Response } from 'express'
import { default as Server, default as httpProxy } from 'http-proxy'
import { AsyncReturnType, SetReturnType } from 'type-fest'
import UrlPattern from 'url-pattern'

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
  server.use((req, res, next) => {
    const host = req.headers.host
    if (!host) {
      throw new Error(`Host not found`)
    }
    res.locals.host = host
    next()
  })

  server.use(async (req, res, next) => {
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

  server.use(async (req, res, next) => {
    try {
      {
        for (let i = 0; i < middleware.length; i++) {
          const m = middleware[i]!
          const handled = await m(req, res, next)
          if (handled) break
        }
      }
    } catch (e) {
      const msg = (() => (e instanceof Error ? e.message : `${e}`))()
      warn(msg)
      res.writeHead(403, {
        'Content-Type': `text/plain`,
      })
      res.end(msg)
      return
    }
  })

  server.listen(DAEMON_PORT(), () => {
    info(`daemon listening on port ${DAEMON_PORT()}`)
  })

  asyncExitHook(async () => {
    info(`Shutting down proxy server`)
  })

  type MiddlewareListener = SetReturnType<
    RequestHandler,
    boolean | Promise<boolean>
  >
  const middleware: MiddlewareListener[] = []

  const use = (
    urlFilters: string | string[],
    handler: ProxyMiddleware,
    handlerName: string,
  ) => {
    const _handlerLogger = _proxyLogger.create(`${handlerName}`)
    const { dbg, trace } = _handlerLogger
    dbg({ urlFilters })

    const _urlFilters = Array.isArray(urlFilters)
      ? urlFilters.map((f) => new UrlPattern(f))
      : [new UrlPattern(urlFilters)]

    middleware.push((req, res) => {
      const { host } = res.locals
      const _requestLogger = _handlerLogger.create(host)
      const { dbg, trace } = _requestLogger
      _requestLogger.breadcrumb(req.method || 'unknown http method')
      _requestLogger.breadcrumb(req.url || 'unknown url')
      const [subdomain, ...junk] = host.split('.')
      if (!subdomain) {
        throw new Error(`${host} has no subdomain.`)
      }
      const { url } = req
      if (!url) {
        throw new Error(`Expected URL here`)
      }
      trace({ _urlFilters, host, url })

      if (
        !_urlFilters.find((u) => {
          const isMatch = !!u.match(url)
          if (isMatch) {
            trace(`Matched ${url}`)
          } else {
            trace(`No match for ${url}`)
          }
          return isMatch
        })
      ) {
        dbg(`${url} does not match pattern ${urlFilters}`)
        return false
      }
      dbg(`${url} matches ${urlFilters}, sending to handler`)
      return handler(
        req,
        res,
        { host, subdomain, coreInternalUrl, proxy },
        _requestLogger,
      )
    })
  }

  return { use }
})
