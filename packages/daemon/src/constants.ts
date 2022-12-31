import { existsSync } from 'fs'
import { join } from 'path'
import { env, envb, envi } from './util/env'
export const PUBLIC_APP_PROTOCOL = env('PUBLIC_APP_PROTOCOL', 'https')
export const PUBLIC_PB_PROTOCOL = env('PUBLIC_PB_PROTOCOL', `https`)
export const PUBLIC_APP_DOMAIN = env('PUBLIC_APP_DOMAIN', `pockethost.test`)
export const PUBLIC_PB_DOMAIN = env('PUBLIC_PB_DOMAIN', `pockethost.test`)
export const PUBLIC_PB_SUBDOMAIN = env(
  'PUBLIC_PB_SUBDOMAIN',
  `pockethost-central`
)
export const DAEMON_PB_USERNAME = (() => {
  const v = env('DAEMON_PB_USERNAME')
  if (!v) {
    throw new Error(`DAEMON_PB_USERNAME environment variable must be specified`)
  }
  return v
})()
export const DAEMON_PB_PASSWORD = (() => {
  const v = env('DAEMON_PB_PASSWORD')
  if (!v) {
    throw new Error(`DAEMON_PB_PASSWORD environment variable must be specified`)
  }
  return v
})()
export const DAEMON_PB_PORT_BASE = envi('DAEMON_PB_PORT_BASE', 8090)
export const DAEMON_PB_IDLE_TTL = envi('DAEMON_PB_IDLE_TTL', 5000)
export const DAEMON_PB_DATA_DIR = (() => {
  const v = env('DAEMON_PB_DATA_DIR')
  if (!v) {
    throw new Error(
      `DAEMON_PB_DATA_DIR (${v}) environment variable must be specified`
    )
  }
  if (!existsSync(v)) {
    throw new Error(`DAEMON_PB_DATA_DIR (${v}) path must exist`)
  }
  return v
})()

export const NODE_ENV = env('NODE_ENV', '')
export const DEBUG = envb('DEBUG', NODE_ENV === 'development')

export const DAEMON_PB_BACKUP_SLEEP = envi(`DAEMON_PB_BACKUP_SLEEP`, 100)
export const DAEMON_PB_BACKUP_PAGE_COUNT = envi(
  `DAEMON_PB_BACKUP_PAGE_COUNT`,
  5
)

export const PH_BIN_CACHE = env(
  `PH_BIN_CACHE`,
  join(__dirname, `../../../.pbincache`)
)

export const PH_FTP_PORT = envi('PH_FTP_PORT', 21)

export const SSL_KEY = env('SSL_KEY')
export const SSL_CERT = env('SSL_CERT')
