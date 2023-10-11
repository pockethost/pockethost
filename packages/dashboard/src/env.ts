import { dev } from '$app/environment'
import { env as _env } from '$env/dynamic/public'
import publicRoutes from '$util/public-routes.json'
import { logger } from '@pockethost/common'
import { boolean } from 'boolean'
import UrlPattern from 'url-pattern'
import base from '../../../package.json'

export type PublicEnvName = `PUBLIC_${string}`

export const env = (name: PublicEnvName, _default: string = '') => {
  const v = _env[name]
  if (!v) return _default
  return v
}

export const envi = (name: PublicEnvName, _default: number) =>
  parseInt(env(name, _default.toString()))

export const envb = (name: PublicEnvName, _default: boolean) =>
  boolean(env(name, _default.toString()))

export const BLOG_DOMAIN = env('PUBLIC_BLOG_DOMAIN', 'pockethost.io')
export const APP_DOMAIN = env('PUBLIC_APP_DOMAIN', 'app.pockethost.io')
export const EDGE_APEX_DOMAIN = env('PUBLIC_EDGE_APEX_DOMAIN', 'pockethost.io')
export const HTTP_PROTOCOL = env('PUBLIC_HTTP_PROTOCOL', 'https')
export const MOTHERSHIP_DOMAIN = env(
  'PUBLIC_MOTHERSHIP_DOMAIN',
  'pockethost-central.pockethost.io',
)

export const PUBLIC_DEBUG = envb('PUBLIC_DEBUG', dev)

export const PUBLIC_POCKETHOST_VERSION = base.version

export const PUBLIC_ROUTES = publicRoutes.map(
  (pattern) => new UrlPattern(pattern),
)

try {
  logger()
} catch {
  logger({ debug: PUBLIC_DEBUG, trace: false, errorTrace: false })
}
