import {
  APEX_DOMAIN,
  DAEMON_PORT,
  IPCIDR_LIST,
  IS_DEV,
  logger,
  MOTHERSHIP_NAME,
  MOTHERSHIP_PORT,
  neverendingPromise,
  SSL_CERT,
  SSL_KEY,
} from '@'
import { forEach } from '@s-libs/micro-dash'
import cors from 'cors'
import express, { ErrorRequestHandler } from 'express'
import 'express-async-errors'
import enforce from 'express-sslify'
import fs from 'fs'
import http from 'http'
import { createProxyMiddleware } from 'http-proxy-middleware'
import https from 'https'
import { createIpWhitelistMiddleware } from './cidr'
import { createVhostProxyMiddleware } from './createVhostProxyMiddleware'

export const firewall = async () => {
  const { dbg, error } = logger()

  const PROD_ROUTES = {
    [`${MOTHERSHIP_NAME()}.${APEX_DOMAIN()}`]: `http://localhost:${MOTHERSHIP_PORT()}`,
  }
  const DEV_ROUTES = {
    [`mail.${APEX_DOMAIN()}`]: `http://localhost:${1080}`,
    [`${MOTHERSHIP_NAME()}.${APEX_DOMAIN()}`]: `http://localhost:${MOTHERSHIP_PORT()}`,
    [`${APEX_DOMAIN()}`]: `http://localhost:${5174}`,
  }
  const hostnameRoutes = IS_DEV() ? DEV_ROUTES : PROD_ROUTES

  // Create Express app
  const app = express()

  app.options('*', cors()) // include before other routes
  app.use(cors())
  app.use(enforce.HTTPS())

  app.get(`/_api/firewall/health`, (req, res, next) => {
    dbg(`Health check`)
    res.json({ status: 'firewall ok' })
    res.end()
  })

  // Use the IP blocker middleware
  app.use(createIpWhitelistMiddleware(IPCIDR_LIST()))

  forEach(hostnameRoutes, (target, host) => {
    app.use(createVhostProxyMiddleware(host, target, IS_DEV()))
  })

  // Fall-through
  const handler = createProxyMiddleware({
    target: `http://localhost:${DAEMON_PORT()}`,
  })
  app.all(`*`, (req, res, next) => {
    const method = req.method
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl

    dbg(`${method} ${fullUrl} -> ${`http://localhost:${DAEMON_PORT()}`}`)

    handler(req, res, next)
  })

  const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    error(err)
    res.status(500).send(err.toString())
  }
  app.use(errorHandler)

  const httpServer = http.createServer(app)
  httpServer.on('error', (err) => {
    error(err)
  })
  httpServer.listen(80, () => {
    dbg('SSL redirect server listening on 80')
  })

  // HTTPS server options
  const httpsOptions = {
    key: fs.readFileSync(SSL_KEY()),
    cert: fs.readFileSync(SSL_CERT()),
  }

  // Create HTTPS server
  const httpsServer = https.createServer(httpsOptions, app)
  httpsServer.on('error', (err) => {
    error(err)
  })

  httpsServer.listen(443, () => {
    dbg('HTTPS server running on port 443')
  })

  await neverendingPromise()
}
