import { browser } from '$app/environment'
import { env as _env } from '$env/dynamic/public'
import { boolean } from 'boolean'
import base from '../../../package.json'

export const env = (name: string, _default: string = '') => {
  const v = _env[name]
  if (!v) return _default
  return v
}

export const envi = (name: string, _default: number) => parseInt(env(name, _default.toString()))

export const envb = (name: string, _default: boolean) => boolean(env(name, _default.toString()))

export const PUBLIC_PB_DOMAIN = env('PUBLIC_PB_DOMAIN', 'pockethost.io')
export const PUBLIC_PB_SUBDOMAIN = env('PUBLIC_PB_SUBDOMAIN', 'pockethost-central')
export const PUBLIC_APP_DOMAIN = env('PUBLIC_PB_SUBDOMAIN', 'localhost')
export const PUBLIC_APP_PROTOCOL = env('PUBLIC_APP_PROTOCOL', 'https')
export const PUBLIC_PB_PROTOCOL = env(
  'PUBLIC_PB_PROTOCOL',
  browser ? window.location.protocol : 'https'
)
export const PUBLIC_DEBUG = envb('PUBLIC_DEBUG', false)

export const PUBLIC_POCKETHOST_VERSION = base.version
