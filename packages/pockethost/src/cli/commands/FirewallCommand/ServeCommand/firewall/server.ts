import { forEach } from '@s-libs/micro-dash'
import cors from 'cors'
import express, { ErrorRequestHandler } from 'express'
import 'express-async-errors'
import enforce from 'express-sslify'
import fs from 'fs'
import http from 'http'
import { createProxyMiddleware } from 'http-proxy-middleware'
import https from 'https'
import { LoggerService } from '../../../../../common'
import {
  APEX_DOMAIN,
  APP_NAME,
  DAEMON_PORT,
  IPCIDR_LIST,
  IS_DEV,
  MOTHERSHIP_NAME,
  MOTHERSHIP_PORT,
  SSL_CERT,
  SSL_KEY,
  discordAlert,
} from '../../../../../core'
import { createIpWhitelistMiddleware } from './cidr'
import { createVhostProxyMiddleware } from './createVhostProxyMiddleware'

export const firewall = async () => {
  const { debug } = LoggerService().create(`proxy`)

  const PROD_ROUTES = {
    [`${MOTHERSHIP_NAME()}.${APEX_DOMAIN()}`]: `http://localhost:${MOTHERSHIP_PORT()}`,
  }
  const DEV_ROUTES = {
    [`mail.${APEX_DOMAIN()}`]: `http://localhost:${1080}`,
    [`${MOTHERSHIP_NAME()}.${APEX_DOMAIN()}`]: `http://localhost:${MOTHERSHIP_PORT()}`,
    [`${APP_NAME()}.${APEX_DOMAIN()}`]: `http://localhost:${5174}`,
    [`superadmin.${APEX_DOMAIN()}`]: `http://localhost:${5175}`,
    [`${APEX_DOMAIN()}`]: `http://localhost:${8080}`,
  }
  const hostnameRoutes = IS_DEV() ? DEV_ROUTES : PROD_ROUTES

  // Create Express app
  const app = express()

  app.options('*', cors()) // include before other routes
  app.use(cors())
  app.use(enforce.HTTPS())

  // Use the IP blocker middleware
  app.use(createIpWhitelistMiddleware(IPCIDR_LIST()))

  forEach(hostnameRoutes, (target, host) => {
    app.use(createVhostProxyMiddleware(host, target, IS_DEV()))
  })

  app.get(`/_api/health`, (req, res, next) => {
    res.json({ status: 'ok' })
    res.end()
  })

  // Fall-through
  const handler = createProxyMiddleware({
    target: `http://localhost:${DAEMON_PORT()}`,
  })
  app.all(`*`, (req, res, next) => {
    const method = req.method
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl

    debug(`${method} ${fullUrl} -> ${`http://localhost:${DAEMON_PORT()}`}`)

    handler(req, res, next)
  })

  const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    discordAlert(err.toString())
    res.status(500).send(err.toString())
  }
  app.use(errorHandler)

  http.createServer(app).listen(80, () => {
    console.log('SSL redirect server listening on 80')
  })

  // HTTPS server options
  const httpsOptions = {
    key: fs.readFileSync(SSL_KEY()),
    cert: fs.readFileSync(SSL_CERT()),
  }

  // Create HTTPS server
  https.createServer(httpsOptions, app).listen(443, () => {
    console.log('HTTPS server running on port 443')
  })
}
