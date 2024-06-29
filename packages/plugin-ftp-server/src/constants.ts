import { join } from 'path'
import { PH_HOME, Settings, mkNumber, mkPath, mkString } from 'pockethost/core'

export const PLUGIN_NAME = `plugin-ftp-server`

export const HOME_DIR =
  process.env.PH_FIREWALL_HOME || join(PH_HOME(), PLUGIN_NAME)

export const TLS_PFX = `tls`

const settings = Settings({
  PH_FTP_HOME: mkPath(HOME_DIR, { create: true }),
  PH_FTP_PORT: mkNumber(21),
  PH_FTP_SSL_KEY: mkPath(join(HOME_DIR, `${TLS_PFX}.key`), {
    required: false,
  }),
  PH_FTP_SSL_CERT: mkPath(join(HOME_DIR, `${TLS_PFX}.cert`), {
    required: false,
  }),
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
