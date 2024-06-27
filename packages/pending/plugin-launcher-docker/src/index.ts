import devcert from 'devcert'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  APEX_DOMAIN,
  IS_DEV,
  LoggerService,
  PH_HOME,
  PocketHostAction,
  PocketHostPlugin,
  Settings,
  mkPath,
} from 'pockethost/core'

const _HOME_DIR =
  process.env.PH_FIREWALL_HOME ||
  join(PH_HOME(), `plugin-docker-launch-provider`)

const TLS_PFX = `tls`

const settings = Settings({
  PH_DOCKER_LAUNCH_PROVIDER_HOME: mkPath(_HOME_DIR, { create: true }),
})

const plugin: PocketHostPlugin = async ({ registerAction, registerFilter }) => {
  const logger = LoggerService().create('FirewallPlugin')
  const { dbg } = logger

  registerAction(PocketHostAction.Core_Init, async () => {
    if (IS_DEV()) {
      mkdirSync(_HOME_DIR, { recursive: true })
      const { key, cert } = await devcert.certificateFor(APEX_DOMAIN(), {})
      writeFileSync(SSL_KEY(), key)
      writeFileSync(SSL_CERT(), cert)
    }
  })
}

export default plugin
