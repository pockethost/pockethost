import {
  APEX_DOMAIN,
  corsMiddleware,
  DAEMON_PORT,
  enforceHttps,
  IPCIDR_LIST,
  IS_DEV,
  Logger,
  MOTHERSHIP_NAME,
  MOTHERSHIP_PORT,
  PH_DISABLE_FIREWALL_RATE_LIMIT,
  PH_USER_PROXY_IPS,
  SSL_CERT,
  SSL_KEY,
} from '@'
import { exec } from 'child_process'
import express, { ErrorRequestHandler } from 'express'
import { existsSync, readFileSync } from 'fs'
import http from 'http'
import { createProxyMiddleware } from 'http-proxy-middleware'
import https from 'https'
import { createIpWhitelistMiddleware } from './cidr'
import { createVhostProxyMiddleware } from './createVhostProxyMiddleware'
import { createRateLimiterMiddleware } from './rate-limiter'

export type FirewallOptions = {
  logger: Logger
}

export const firewall = async ({ logger }: FirewallOptions) => {
  const { dbg, error, info } = logger.create(`firewall`)

  const PROD_ROUTES = {
    [`${MOTHERSHIP_NAME()}.${APEX_DOMAIN()}`]: `http://localhost:${MOTHERSHIP_PORT()}`,
  }
  const DEV_ROUTES = {
    [`mail.${APEX_DOMAIN()}`]: `http://localhost:${1080}`,
    [`${MOTHERSHIP_NAME()}.${APEX_DOMAIN()}`]: `http://localhost:${MOTHERSHIP_PORT()}`,
    [`app.${APEX_DOMAIN()}`]: `http://localhost:${5174}`,
    [`${APEX_DOMAIN()}`]: `http://localhost:${5174}`,
  }
  const hostnameRoutes = IS_DEV() ? DEV_ROUTES : PROD_ROUTES
  const tlsReady = existsSync(SSL_KEY()) && existsSync(SSL_CERT())

  // Create Express app
  const app = express()

  app.options('/{*path}', corsMiddleware)
  app.use(corsMiddleware)
  if (!IS_DEV() || tlsReady) {
    app.use(enforceHttps)
  }

  app.get(`/api/firewall/health`, (req, res, next) => {
    dbg(`Health check`)
    res.json({ status: 'firewall ok', code: 200 })
    res.end()
  })

  app.get(`/api/_private/reset`, (req, res, next) => {
    dbg(`Reset password`)

    const secretParam = Array.isArray((req.query as any)?.secret)
      ? (req.query as any).secret[0]
      : (req.query as any)?.secret

    if (!secretParam || secretParam !== process.env.PH_SECRET) {
      res.status(401).json({ error: 'unauthorized', code: 401 })
      res.end()
      return
    }

    exec('pm2 restart edge-daemon', (err, stdout, stderr) => {
      if (err) {
        error(err)
        res.status(500).json({ error: 'pm2 reset failed', code: 500 })
        res.end()
        return
      }
      info(stdout)
      info(stderr)

      res.json({ status: 'pm2 reset ok', code: 200 })
      res.end()
    })
  })

  // Use the IP blocker middleware
  app.use(createIpWhitelistMiddleware(IPCIDR_LIST()))
  if (PH_DISABLE_FIREWALL_RATE_LIMIT()) {
    info(`Firewall rate limiting disabled (PH_DISABLE_FIREWALL_RATE_LIMIT)`)
  } else {
    app.use(createRateLimiterMiddleware(logger, PH_USER_PROXY_IPS()))
  }

  Object.entries(hostnameRoutes).forEach(([host, target]) => {
    app.use(createVhostProxyMiddleware(host, target, IS_DEV(), logger))
  })

  // Fall-through to edge daemon
  const handler = createProxyMiddleware({
    target: `http://localhost:${DAEMON_PORT()}`,
  })
  app.use((req, res, next) => {
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
    dbg(tlsReady ? 'HTTP redirect server listening on 80' : 'HTTP server listening on 80')
  })

  if (!tlsReady && !IS_DEV()) {
    throw new Error(`TLS cert missing: ${SSL_CERT()}`)
  }

  if (tlsReady) {
    const httpsOptions = {
      key: readFileSync(SSL_KEY()),
      cert: readFileSync(SSL_CERT()),
    }

    const httpsServer = https.createServer(httpsOptions, app)
    httpsServer.on('error', (err) => {
      error(err)
    })

    httpsServer.listen(443, () => {
      dbg('HTTPS server running on port 443')
    })
  } else if (IS_DEV()) {
    dbg('HTTPS skipped — run pnpm dev:cli serve to generate dev TLS certs')
  }
}
