import {
  APEX_DOMAIN,
  DAEMON_PORT,
  enforceHttps,
  IPCIDR_LIST,
  IS_DEV,
  Logger,
  MOTHERSHIP_NAME,
  MOTHERSHIP_PORT,
  PH_DISABLE_FIREWALL_RATE_LIMIT,
  PH_FIREWALL_DAEMON_GRACE_MS,
  SSL_CERT,
  SSL_KEY,
} from '@'
import { exec } from 'child_process'
import express, { ErrorRequestHandler, Request, Response } from 'express'
import { existsSync, readFileSync } from 'fs'
import type { IncomingMessage } from 'http'
import http from 'http'
import { createProxyMiddleware } from 'http-proxy-middleware'
import https from 'https'
import type { Socket } from 'net'
import { createIpWhitelistMiddleware } from './cidr'
import { createVhostProxyMiddleware, type VhostUpgradeHandler } from './createVhostProxyMiddleware'
import { createDaemonGraceMiddleware, createDaemonProxyErrorHandler } from './daemonGrace'
import { createEdgeRoutingMiddleware } from './edgeRouting'
import { initFirewallTrustedIps } from './initFirewallTrustedIps'
import { createInstanceCorsMiddleware, rewriteProxiedCorsHeaders } from './instanceCors'
import { createRateLimiterMiddleware } from './rate-limiter'

export type FirewallOptions = {
  logger: Logger
}

export const firewall = async ({ logger }: FirewallOptions) => {
  const { dbg, info, error } = logger.create(`firewall`)

  // In production the mothership is reached through its own Cloudflare Tunnel, never through an edge firewall.
  const PROD_ROUTES: Record<string, string> = {}
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

  // The mothership mirror (needed for rate limits and per-instance CORS) is only started when rate limiting is on.
  // Without it, every host keeps the permissive edge CORS.
  const trustedIpResolver = PH_DISABLE_FIREWALL_RATE_LIMIT() ? null : await initFirewallTrustedIps(logger)

  app.use(createInstanceCorsMiddleware({ getInstanceSecrets: trustedIpResolver?.getInstanceSecrets }))
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

    const { error: logError } = logger.create(`firewall`)
    exec('pm2 restart edge-daemon', (err, stdout, stderr) => {
      if (err) {
        logError(err)
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
  if (!trustedIpResolver) {
    info(`Firewall rate limiting disabled (PH_DISABLE_FIREWALL_RATE_LIMIT)`)
  } else {
    app.use(
      createRateLimiterMiddleware(logger, {
        isTrustedConnectingIp: trustedIpResolver.isTrustedConnectingIp,
        getInstanceFirewall: trustedIpResolver.getInstanceFirewall,
      })
    )
  }

  const graceMs = PH_FIREWALL_DAEMON_GRACE_MS()
  if (graceMs > 0) {
    info(`Firewall daemon grace enabled: ${graceMs}ms (PH_FIREWALL_DAEMON_GRACE_MS)`)
  }

  const vhostUpgradeHandlers: VhostUpgradeHandler[] = []
  Object.entries(hostnameRoutes).forEach(([host, target]) => {
    const { middleware, upgrade } = createVhostProxyMiddleware(host, target, IS_DEV(), logger)
    app.use(middleware)
    if (upgrade) {
      vhostUpgradeHandlers.push(upgrade)
    }
  })

  const handleVhostUpgrade = (req: IncomingMessage, socket: Socket, head: Buffer) => {
    for (const upgrade of vhostUpgradeHandlers) {
      if (upgrade(req, socket, head)) {
        return
      }
    }
    socket.destroy()
  }

  const daemonTarget = `http://localhost:${DAEMON_PORT()}`
  const daemonProxyErrorHandler = createDaemonProxyErrorHandler(logger)
  const handler = createProxyMiddleware<Request, Response>({
    target: daemonTarget,
    on: {
      error: (err, req, res) => {
        if (!('status' in res)) return
        daemonProxyErrorHandler(err, req, res, () => undefined)
      },
      proxyRes: (proxyRes, _req, res) => {
        rewriteProxiedCorsHeaders(proxyRes, res)
      },
    },
  })

  // Instances on other edges are proxied to their edge before the local daemon (and its grace) is involved.
  if (trustedIpResolver) {
    app.use(createEdgeRoutingMiddleware(trustedIpResolver.mirror, logger))
  } else {
    info(`Edge routing disabled: it needs the mothership mirror, which starts with firewall rate limiting`)
  }
  app.use(createDaemonGraceMiddleware(logger))
  app.use((req, res, next) => {
    const method = req.method
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl

    dbg(`${method} ${fullUrl} -> ${daemonTarget}`)

    handler(req, res, next)
  })

  const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    if (res.headersSent) {
      next(err)
      return
    }
    daemonProxyErrorHandler(err, req, res, next)
  }
  app.use(errorHandler)

  const httpServer = http.createServer(app)
  httpServer.on('error', (err) => {
    error(err)
  })
  if (vhostUpgradeHandlers.length > 0) {
    httpServer.on('upgrade', handleVhostUpgrade)
  }
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
    if (vhostUpgradeHandlers.length > 0) {
      httpsServer.on('upgrade', handleVhostUpgrade)
    }

    httpsServer.listen(443, () => {
      dbg('HTTPS server running on port 443')
    })
  } else if (IS_DEV()) {
    dbg('HTTPS skipped — run pnpm dev:cli serve to generate dev TLS certs')
  }
}
