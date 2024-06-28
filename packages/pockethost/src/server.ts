import express, { ErrorRequestHandler } from 'express'
import 'express-async-errors'
import { default as httpProxy } from 'http-proxy'
import {
  LoggerService,
  doAfterInstanceFoundAction,
  doAfterServerStartAction,
  doAppMountedAction,
  doGetInstanceByRequestInfoFilter,
  doGetOrProvisionInstanceUrlFilter,
  doIncomingRequestAction,
  doRequestErrorAction,
  doRequestErrorMessageFilter,
} from '../common'
import { APEX_DOMAIN, PORT, asyncExitHook } from '../core'

export const serve = async () => {
  const _proxyLogger = LoggerService().create('ProxyService')
  const { dbg, error, info, trace, warn } = _proxyLogger

  // registerFilter(
  //   CoreFilters.Waf_VHosts,
  //   async (routes: { [_: string]: string }) => {
  //     return { ...routes, '*': `http://localhost:${PORT()}` }
  //   },
  //   99,
  // )

  const proxy = httpProxy.createProxyServer({})
  proxy.on('error', (err, req, res, target) => {
    warn(`Proxy error ${err} on ${req.url} (${req.headers.host})`)
    console.log(err)
  })

  const app = express()

  app.get('/_api/health', (req, res, next) => {
    res.json({ status: 'ok' })
    res.end
  })

  const errorHandler: ErrorRequestHandler = async (err, req, res, next) => {
    doRequestErrorAction({ err })
    res.status(500).send(await doRequestErrorMessageFilter(err.toString()))
  }
  app.use(errorHandler)

  doAppMountedAction({ app })

  app.all(`*`, async (req, res, next) => {
    const method = req.method
    const fullUrl = new URL(
      req.protocol + '://' + req.get('host') + req.originalUrl,
    )
    const host = fullUrl.hostname
    if (!host) {
      throw new Error(`Host not found`)
    }
    const subdomain = host.slice(0, -`.${APEX_DOMAIN()}`.length)

    dbg(
      `${method} ${fullUrl} (${subdomain}) -> ${`http://localhost:${PORT()}`}`,
    )

    await doIncomingRequestAction({ req, res, host })

    const instance = await doGetInstanceByRequestInfoFilter(undefined, {
      req,
      res,
      host,
      subdomain,
    })
    if (!instance) {
      res.status(404).end(`${host} not found`)
      return
    }

    await doAfterInstanceFoundAction({
      instance,
      req,
      res,
      host,
    })

    const url = await doGetOrProvisionInstanceUrlFilter('', {
      req,
      res,
      instance,
      host,
      subdomain,
    })

    dbg(`Forwarding request for ${req.url} to instance ${url}`)

    proxy.web(req, res, { target: url })

    // next()
  })

  app.listen(PORT(), () => {
    info(`pockethost listening on port ${PORT()}`)
    doAfterServerStartAction()
  })

  asyncExitHook(async () => {
    info(`Shutting down pockethost`)
  })
}
