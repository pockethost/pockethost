import devcert from 'devcert'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  APEX_DOMAIN,
  Command,
  IS_DEV,
  PH_HOME,
  PocketHostAction,
  PocketHostFilter,
  PocketHostPlugin,
  Settings,
  mkNumber,
  mkPath,
  mkString,
} from 'pockethost/core'
import { FtpCommand } from './FtpCommand'

const _HOME_DIR =
  process.env.PH_FIREWALL_HOME || join(PH_HOME(), `plugin-ftp-server`)

const TLS_PFX = `tls`

const settings = Settings({
  PH_FTP_HOME: mkPath(_HOME_DIR, { create: true }),
  PH_FTP_PORT: mkNumber(21),
  PH_FTP_SSL_KEY: mkPath(join(_HOME_DIR, `${TLS_PFX}.key`)),
  PH_FTP_SSL_CERT: mkPath(join(_HOME_DIR, `${TLS_PFX}.cert`)),
  PH_FTP_PASV_IP: mkString(`0.0.0.0`),
  PH_FTP_PASV_PORT_MIN: mkNumber(10000),
  PH_FTP_PASV_PORT_MAX: mkNumber(20000),
})

export const PORT = () => settings.PH_FTP_PORT
export const SSL_KEY = () => settings.PH_FTP_SSL_KEY
export const SSL_CERT = () => settings.PH_FTP_SSL_CERT
export const PASV_IP = () => settings.PH_FTP_PASV_IP
export const PASV_PORT_MIN = () => settings.PH_FTP_PASV_PORT_MIN
export const PASV_PORT_MAX = () => settings.PH_FTP_PASV_PORT_MAX

const plugin: PocketHostPlugin = async ({ registerAction, registerFilter }) => {
  registerFilter(
    PocketHostFilter.Core_CliCommands,
    async (commands: Command[]) => {
      return [...commands, FtpCommand()]
    },
  )

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
