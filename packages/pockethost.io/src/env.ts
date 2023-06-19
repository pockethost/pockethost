import { dev } from '$app/environment'
import { env as _env } from '$env/dynamic/public'
import publicRoutes from '$util/public-routes.json'
import { logger } from '@pockethost/common'
import { boolean } from 'boolean'
import UrlPattern from 'url-pattern'
import base from '../../../package.json'

export const env = (name: string, _default: string = '') => {
  const v = _env[name]
  if (!v) return _default
  return v
}

export const envi = (name: string, _default: number) => parseInt(env(name, _default.toString()))

export const envb = (name: string, _default: boolean) => boolean(env(name, _default.toString()))

export const PUBLIC_APP_DB = env('PUBLIC_APP_DB', 'pockethost-central')
export const PUBLIC_APP_DOMAIN = env('PUBLIC_APP_DOMAIN', 'pockethost.io')
export const PUBLIC_APP_PROTOCOL = env('PUBLIC_APP_PROTOCOL', 'https')

export const PUBLIC_DEBUG = envb('PUBLIC_DEBUG', dev)

export const PUBLIC_POCKETHOST_VERSION = base.version

export const PUBLIC_ROUTES = publicRoutes.map((pattern) => new UrlPattern(pattern))

try {
  logger()
} catch {
  logger({ debug: PUBLIC_DEBUG, trace: false, errorTrace: false })
}
