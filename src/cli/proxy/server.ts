import {
  DAEMON_PORT,
  DefaultSettingsService,
  IPCIDR_LIST,
  MOTHERSHIP_PORT,
  SETTINGS,
} from '$constants'
import { forEach } from '@s-libs/micro-dash'
import cors from 'cors'
import express from 'express'
import fs from 'fs'
import https from 'https'

import { createIpWhitelistMiddleware } from './cidr'
import { createVhostProxyMiddleware } from './createVhostProxyMiddleware'

DefaultSettingsService(SETTINGS)

const hostnameRoutes = {
  'pockethost-central.pockethost.io': `http://localhost:${MOTHERSHIP_PORT()}`,
  '*.pockethost.io': `http://localhost:${DAEMON_PORT()}`,
}

// Create Express app
const app = express()

app.use(cors())

// Use the IP blocker middleware
app.use(createIpWhitelistMiddleware(IPCIDR_LIST()))

forEach(hostnameRoutes, (target, host) => {
  app.use(createVhostProxyMiddleware(host, target))
})

// HTTPS server options
const httpsOptions = {
  key: fs.readFileSync(
    '/home/pockethost/pockethost/ssl/cloudflare-privkey.pem',
  ),
  cert: fs.readFileSync(
    '/home/pockethost/pockethost/ssl/cloudflare-origin.pem',
  ),
}

// Create HTTPS server
https.createServer(httpsOptions, app).listen(443, () => {
  console.log('HTTPS server running on port 443')
})
