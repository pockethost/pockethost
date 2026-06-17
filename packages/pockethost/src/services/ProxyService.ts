import { corsMiddleware } from '@'
import express, { Request, Response } from 'express'
import { createProxyServer, type ProxyServer } from 'httpxy'
import { AsyncReturnType } from 'type-fest'
import {
  DAEMON_PORT,
  EdgeTrafficStatsSnapshot,
  Logger,
  LoggerService,
  SingletonBaseConfig,
  asyncExitHook,
  mkSingleton,
  registerEdgeTrafficStatsController,
  seqid,
} from '..'

export type ProxyServiceApi = AsyncReturnType<typeof proxyService>

export type ProxyMiddleware = (
  req: Request,
  res: Response,
  meta: {
    subdomain: string
    coreInternalUrl: string
    proxy: ProxyServer
    host: string
  },
  logger: Logger
) => boolean | Promise<boolean>

export type ProxyServiceConfig = SingletonBaseConfig & {
  coreInternalUrl: string
}

let instanceTrafficReady = false

export const setInstanceTrafficReady = (ready = true) => {
  instanceTrafficReady = ready
}

export const isInstanceTrafficReady = () => instanceTrafficReady
export const proxyService = mkSingleton(
  async (config: ProxyServiceConfig): Promise<{ use: ReturnType<typeof express>['use'] }> => {
    const _proxyLogger = LoggerService().create('ProxyService')
    const { dbg, error, info, trace, warn } = _proxyLogger

    const { coreInternalUrl } = config

    const stats = (() => {
      const metrics = {
        requests: 0,
        errors: 0,
        hosts: new Map<string, number>(),
        ips: new Map<string, number>(),
        countries: new Map<string, number>(),
      }

      const topEntries = (map: Map<string, number>, limit = 10) =>
        Array.from(map.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, limit)

      const snapshot = (): EdgeTrafficStatsSnapshot => ({
        requests: metrics.requests,
        errors: metrics.errors,
        hosts: topEntries(metrics.hosts),
        ips: topEntries(metrics.ips),
        countries: topEntries(metrics.countries),
      })

      const flush = () => {
        metrics.requests = 0
        metrics.errors = 0
        metrics.ips.clear()
        metrics.hosts.clear()
        metrics.countries.clear()
      }

      registerEdgeTrafficStatsController({ snapshot, flush })

      return {
        addRequest: () => {
          metrics.requests++
        },
        addError: () => {
          metrics.errors++
        },
        addHost: (host: string) => {
          metrics.hosts.set(host, (metrics.hosts.get(host) || 0) + 1)
        },
        addIp: (ip: string) => {
          metrics.ips.set(ip, (metrics.ips.get(ip) || 0) + 1)
        },
        addCountry: (country: string) => {
          metrics.countries.set(country, (metrics.countries.get(country) || 0) + 1)
        },
      }
    })()

    const proxy = createProxyServer({})
    proxy.on('error', (err, req, res, target) => {
      const url = req?.url ?? '<unknown>'
      const host = req?.headers?.host ?? '<unknown>'
      warn(`Proxy error ${err} on ${url} (${host})`)
    })

    const server = express()

    server.use(corsMiddleware)

    const apiRouter = express.Router()

    apiRouter.get('/health', (req, res) => {
      if (!instanceTrafficReady) {
        res.status(503).json({ status: 'starting' })
        return
      }
      res.json({ status: 'ok' })
    })

    server.use('/_api/daemon', apiRouter)

    // Default locals
    server.use((req, res, next) => {
      const host = req.headers.host
      stats.addHost(host || '<unknown>')
      res.locals.requestId = seqid()
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
      const sig = [res.locals.requestId, method.padStart(10), country.padStart(5), ip.padEnd(45), url.toString()].join(
        ' '
      )
      res.locals.sig = sig
      stats.addCountry(country)
      stats.addIp(ip)
      next()
    })

    server.use((req, res, next) => {
      stats.addRequest()
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
      dbg(`Incoming request ${res.locals.sig}`)
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
  }
)
