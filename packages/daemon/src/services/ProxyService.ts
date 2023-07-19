import { PUBLIC_APP_DOMAIN } from '$constants'
import { Logger, mkSingleton, SingletonBaseConfig } from '@pockethost/common'
import { isFunction } from '@s-libs/micro-dash'
import {
  createServer,
  IncomingMessage,
  RequestListener,
  ServerResponse,
} from 'http'
import { default as httpProxy, default as Server } from 'http-proxy'
import { Asyncify, AsyncReturnType } from 'type-fest'
import UrlPattern from 'url-pattern'

export type ProxyServiceApi = AsyncReturnType<typeof proxyService>

export type ProxyMiddleware = (
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage>,
  meta: {
    subdomain: string
    coreInternalUrl: string
    proxy: Server
    host: string
  },
  logger: Logger
) => void | Promise<void>

export type ProxyServiceConfig = SingletonBaseConfig & {
  coreInternalUrl: string
}
export const proxyService = mkSingleton(async (config: ProxyServiceConfig) => {
  const { logger } = config
  const _proxyLogger = logger.create('ProxyService')
  const { dbg, error, info, trace, warn } = _proxyLogger

  const { coreInternalUrl } = config

  const proxy = httpProxy.createProxyServer({})
  proxy.on('error', (err, req, res, target) => {
    warn(`Proxy error ${err} on ${req.url} (${req.headers.host})`)
  })

  const server = createServer(async (req, res) => {
    dbg(`Incoming request ${req.method} ${req.headers.host}/${req.url}`)
    if (!req.headers.host?.endsWith(PUBLIC_APP_DOMAIN)) {
      warn(
        `Request for ${req.headers.host} rejected because host does not end in ${PUBLIC_APP_DOMAIN}`
      )
      res.writeHead(502, {
        'Content-Type': `text/plain`,
      })
      res.end(`${req.headers.host || `Domain`} was rejected.`)
      return
    }
    {
      const { warn } = _proxyLogger.create(
        `${req.method} ${req.headers.host}/${req.url}`
      )
      try {
        for (let i = 0; i < middleware.length; i++) {
          const m = middleware[i]!
          await m(req, res)
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
    }
  })

  info('daemon on port 3000')
  server.listen(3000)

  const shutdown = async () => {
    info(`Shutting down proxy server`)
    return new Promise<void>((resolve) => {
      server.close((err) => {
        if (err) error(err)
        resolve()
      })
      server.closeAllConnections()
    })
  }

  type MiddlewareListener = RequestListener | Asyncify<RequestListener>
  const middleware: MiddlewareListener[] = []

  const use = (
    subdomainFilter: string | ((subdomain: string) => boolean),
    urlFilters: string | string[],
    handler: ProxyMiddleware,
    handlerName: string
  ) => {
    const _handlerLogger = _proxyLogger.create(`${handlerName}`)
    const { dbg, trace } = _handlerLogger
    dbg({ subdomainFilter, urlFilters })

    const _urlFilters = Array.isArray(urlFilters)
      ? urlFilters.map((f) => new UrlPattern(f))
      : [new UrlPattern(urlFilters)]
    const _subdomainFilter = isFunction(subdomainFilter)
      ? subdomainFilter
      : (subdomain: string) =>
          subdomainFilter === '*' || subdomain === subdomainFilter

    middleware.push((req, res) => {
      const host = req.headers.host
      if (!host) {
        throw new Error(`Host not found`)
      }
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
      trace({ subdomainFilter, _urlFilters, host, url })
      if (!_subdomainFilter(subdomain)) {
        trace(`Subdomain ${subdomain} does not match filter ${subdomainFilter}`)
        return
      }
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
        return
      }
      dbg(`${url} matches ${urlFilters}, sending to handler`)
      return handler(
        req,
        res,
        { host, subdomain, coreInternalUrl, proxy },
        _requestLogger
      )
    })
  }

  return { shutdown, use }
})
