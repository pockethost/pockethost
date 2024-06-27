import devcert from 'devcert'
import enforce from 'express-sslify'
import { readFileSync, writeFileSync } from 'fs'
import http from 'http'
import https from 'https'
import {
  APEX_DOMAIN,
  IS_DEV,
  LoggerService,
  PocketHostAction,
  PocketHostFilter,
  type Express,
  type PocketHostPlugin,
} from 'pockethost/core'
import { SSL_CERT, SSL_KEY } from './constants'

const logger = LoggerService().create('plugin-waf-enforce-ssl')
const { dbg, info } = logger

const plugin: PocketHostPlugin = async ({ registerAction, registerFilter }) => {
  dbg(`initializing plugin-waf-enforce-ssl`)

  registerAction(PocketHostAction.Waf_OnAppMiddleware, async (app) => {
    app.use(enforce.HTTPS())
  })

  registerFilter(
    PocketHostFilter.Waf_AppMount,
    async (isMounted: boolean, app: Express) => {
      if (!IS_DEV()) return isMounted

      const { key, cert } = await devcert.certificateFor(APEX_DOMAIN(), {})
      writeFileSync(SSL_KEY(), key)
      writeFileSync(SSL_CERT(), cert)

      http.createServer(app).listen(80, () => {
        info('SSL redirect server listening on 80')
      })

      // HTTPS server options
      const httpsOptions = {
        key: readFileSync(SSL_KEY()),
        cert: readFileSync(SSL_CERT()),
      }

      return new Promise<boolean>((resolve) => {
        // Create HTTPS server
        https.createServer(httpsOptions, app).listen(443, () => {
          info('HTTPS server running on port 443')
          resolve(true)
        })
      })
    },
  )
}

export default plugin
