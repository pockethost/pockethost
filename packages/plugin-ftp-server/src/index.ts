import { join } from 'path'
import { PH_HOME } from 'pockethost/core'
import { plugin } from './plugin'

export const _HOME_DIR =
  process.env.PH_FIREWALL_HOME || join(PH_HOME(), `plugin-ftp-server`)

export const TLS_PFX = `tls`

export default plugin
