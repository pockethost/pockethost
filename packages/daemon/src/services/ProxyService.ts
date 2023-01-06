import { logger, mkSingleton } from '@pockethost/common'
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
  }
) => void

export type ProxyServiceConfig = {
  coreInternalUrl: string
}
export const proxyService = mkSingleton(async (config: ProxyServiceConfig) => {
  const { dbg, error, info, trace } = logger().create('ProxyService')

  const { coreInternalUrl } = config

  const proxy = httpProxy.createProxyServer({})

  const server = createServer(async (req, res) => {
    dbg(`Incoming request ${req.headers.host}/${req.url}`)

    const die = (msg: string) => {
      error(msg)
      res.writeHead(403, {
        'Content-Type': `text/plain`,
      })
      res.end(msg)
    }

    try {
      for (let i = 0; i < middleware.length; i++) {
        const m = middleware[i]!
        await m(req, res)
      }
    } catch (e) {
      die(`${e}`)
      return
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
    const { dbg, trace } = logger().create(`ProxyService:${handlerName}`)
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
      handler(req, res, { host, subdomain, coreInternalUrl, proxy })
    })
  }

  return { shutdown, use }
})
