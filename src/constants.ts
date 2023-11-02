import dotenv from 'dotenv'
import { join } from 'path'
import { env, envb, envfile, envi, envrequired } from './util/env'

dotenv.config({ path: `.env` })

/**
 * Public env vars. These are shared with the frontend and default to production
 * values.
 */

export const APP_URL = env('APP_URL', `https://app.pockethost.io`)
export const BLOG_URL = env('PUBLIC_BLOG_DOMAIN', `https://pockethost.io`)
export const APEX_DOMAIN = env('APEX_DOMAIN', `pockethost.io`)
export const HTTP_PROTOCOL = env('HTTP_PROTOCOL', 'https:')

export const MOTHERSHIP_NAME = env('MOTHERSHIP_NAME', `pockethost-central`)
export const DEBUG = envb('DEBUG', false)

export const mkAppUrl = (path = '') => `${APP_URL}${path}`
export const mkBlogUrl = (path = '') => `${BLOG_URL}${path}`
export const mkDocUrl = (path = '') => mkBlogUrl(join('/docs', path))
export const mkInstanceDataPath = (instanceId: string, ...path: string[]) =>
  join(DAEMON_DATA_ROOT, instanceId, ...path)

// Derived

export const MOTHERSHIP_ADMIN_USERNAME = envrequired(
  'MOTHERSHIP_ADMIN_USERNAME',
)
export const MOTHERSHIP_ADMIN_PASSWORD = envrequired(
  'MOTHERSHIP_ADMIN_PASSWORD',
)

export const IPCIDR_LIST = env('IPCIDR_LIST', '')
  .split(/,/)
  .map((s) => s.trim())
  .filter((v) => !!v)

export const DAEMON_PORT = envi('DAEMON_PORT', 3000)
export const MOTHERSHIP_PORT = envi('MOTHERSHIP_PORT', 8091)

export const DAEMON_PB_IDLE_TTL = envi('DAEMON_PB_IDLE_TTL', 5000)
export const MOTHERSHIP_MIGRATIONS_DIR = envfile('MOTHERSHIP_MIGRATIONS_DIR')

export const MOTHERSHIP_HOOKS_DIR = envfile('MOTHERSHIP_HOOKS_DIR')
export const DAEMON_DATA_ROOT = envfile('DAEMON_DATA_ROOT')

export const DAEMON_INITIAL_PORT_POOL_SIZE = envi(
  `DAEMON_INITIAL_PORT_POOL_SIZE`,
  20,
)

export const PH_BIN_CACHE = envfile(`PH_BIN_CACHE`)

export const PH_FTP_PORT = envi('PH_FTP_PORT', 21)

export const SSL_KEY = envfile('SSL_KEY')
export const SSL_CERT = envfile('SSL_CERT')

export const PH_FTP_PASV_IP = env('PH_FTP_PASV_IP', '0.0.0.0')
export const PH_FTP_PASV_PORT_MIN = envi('PH_FTP_PASV_PORT_MIN', 10000)
export const PH_FTP_PASV_PORT_MAX = envi('PH_FTP_PASV_PORT_MAX', 20000)

export const MOTHERSHIP_SEMVER = env('MOTHERSHIP_SEMVER', '') // This will default always to the max version

console.log({
  HTTP_PROTOCOL,
  APP_URL,
  MOTHERSHIP_NAME,
  BLOG_URL,
  DEBUG,
  APEX_DOMAIN,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_MIGRATIONS_DIR,
  MOTHERSHIP_SEMVER,
  MOTHERSHIP_HOOKS_DIR,
  PH_FTP_PASV_IP,
  PH_FTP_PORT,
  PH_FTP_PASV_PORT_MIN,
  PH_FTP_PASV_PORT_MAX,
  SSL_KEY,
  SSL_CERT,
  PH_BIN_CACHE,
  DAEMON_PB_IDLE_TTL,
  DAEMON_DATA_ROOT,
  IPCIDR_LIST,
})
