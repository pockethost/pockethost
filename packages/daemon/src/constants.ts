import dotenv from 'dotenv'
import { join } from 'path'
import { env, envb, envfile, envi, envrequired } from './util/env'

dotenv.config({ path: `../../.env` })

/**
 * Public env vars. These are shared with the frontend and default to production
 * values.
 */

export const PUBLIC_HTTP_PROTOCOL = env('PUBLIC_HTTP_PROTOCOL', 'https')
export const PUBLIC_APP_DOMAIN = env('PUBLIC_APP_DOMAIN', `app.pockethost.io`)
export const PUBLIC_BLOG_DOMAIN = env('PUBLIC_BLOG_DOMAIN', `pockethost.io`)
export const PUBLIC_EDGE_APEX_DOMAIN = env(
  'PUBLIC_EDGE_APEX_DOMAIN',
  `pockethost.io`,
)
export const PUBLIC_MOTHERSHIP_NAME = env(
  'PUBLIC_MOTHERSHIP_NAME',
  `pockethost-central`,
)
export const PUBLIC_DEBUG = envb('PUBLIC_DEBUG', false)

// Derived
export const MOTHERSHIP_URL = `${PUBLIC_HTTP_PROTOCOL}://${PUBLIC_MOTHERSHIP_NAME}.${PUBLIC_EDGE_APEX_DOMAIN}`

export const MOTHERSHIP_NAME = env('MOTHERSHIP_NAME', `pockethost-central`)

export const DAEMON_PB_USERNAME = envrequired('DAEMON_PB_USERNAME')
export const DAEMON_PB_PASSWORD = envrequired('DAEMON_PB_PASSWORD')

export const DAEMON_IPCIDR_LIST = env('DAEMON_IPCIDR_LIST', '')
  .split(/,/)
  .map((s) => s.trim())
  .filter((v) => !!v)

export const DAEMON_PORT = envi('DAEMON_PORT', 3000)
export const MOTHERSHIP_PORT = envi('MOTHERSHIP_PORT', 8091)

export const DAEMON_PB_PORT_BASE = envi('DAEMON_PB_PORT_BASE', 8090)
export const DAEMON_PB_IDLE_TTL = envi('DAEMON_PB_IDLE_TTL', 5000)
export const DAEMON_PB_MIGRATIONS_DIR = envfile('DAEMON_PB_MIGRATIONS_DIR')

export const DAEMON_PB_HOOKS_DIR = envfile('DAEMON_PB_HOOKS_DIR')
export const DAEMON_PB_DATA_DIR = envfile('DAEMON_PB_DATA_DIR')

export const NODE_ENV = env('NODE_ENV', '')
export const TRACE = envb('TRACE', false)

export const DAEMON_MAX_PORTS = envi(`DAEMON_MAX_PORTS`, 500)

export const PH_BIN_CACHE = envfile(
  `PH_BIN_CACHE`,
  join(__dirname, `../../../.pbincache`),
)

export const PH_FTP_PORT = envi('PH_FTP_PORT', 21)

export const SSL_KEY = envfile('SSL_KEY')
export const SSL_CERT = envfile('SSL_CERT')

export const PH_FTP_PASV_IP = env('PH_FTP_PASV_IP', '0.0.0.0')
export const PH_FTP_PASV_PORT_MIN = envi('PH_FTP_PASV_PORT_MIN', 10000)
export const PH_FTP_PASV_PORT_MAX = envi('PH_FTP_PASV_PORT_MAX', 20000)

export const DENO_PATH = env('DENO_PATH', `deno`)

export const DAEMON_PB_SEMVER = env('DAEMON_PB_SEMVER', '') // This will default always to the max version

export const HOST_OS = env('HOST_OS', 'darwin')
export const DOCKER_ARCH = env('DOCKER_ARCH', 'arm64')

console.log({
  PUBLIC_HTTP_PROTOCOL,
  PUBLIC_APP_DOMAIN,
  PUBLIC_MOTHERSHIP_NAME,
  PUBLIC_BLOG_DOMAIN,
  PUBLIC_DEBUG,
  PUBLIC_EDGE_APEX_DOMAIN,
  DAEMON_PB_USERNAME,
  DAEMON_PB_PASSWORD,
  DAEMON_PB_MIGRATIONS_DIR,
  DAEMON_PB_SEMVER,
  DAEMON_PB_HOOKS_DIR,
  DENO_PATH,
  PH_FTP_PASV_IP,
  PH_FTP_PORT,
  PH_FTP_PASV_PORT_MIN,
  PH_FTP_PASV_PORT_MAX,
  SSL_KEY,
  SSL_CERT,
  PH_BIN_CACHE,
  NODE_ENV,
  TRACE,
  DAEMON_PB_PORT_BASE,
  DAEMON_PB_IDLE_TTL,
  DAEMON_PB_DATA_DIR,
  DAEMON_IPCIDR_LIST,
})
