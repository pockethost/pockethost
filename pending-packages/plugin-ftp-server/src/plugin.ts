import devcert from 'devcert'
import { mkdirSync, writeFileSync } from 'fs'
import { IS_DEV, PocketHostPlugin, onCliCommandsFilter } from 'pockethost'
import { APEX_DOMAIN } from 'pockethost/core'
import { _HOME_DIR } from '.'
import { FtpCommand } from './FtpCommand'
import { SSL_CERT, SSL_KEY } from './constants'

export const plugin: PocketHostPlugin = async ({}) => {
  onCliCommandsFilter(async (commands) => {
    return [...commands, FtpCommand()]
  })

  if (IS_DEV()) {
    mkdirSync(_HOME_DIR, { recursive: true })
    const { key, cert } = await devcert.certificateFor(APEX_DOMAIN(), {})
    writeFileSync(SSL_KEY(), key)
    writeFileSync(SSL_CERT(), cert)
  }
}
