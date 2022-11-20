import { env } from '$env/dynamic/public'
import base from '../../../package.json'

export const {
  PUBLIC_PB_DOMAIN,
  PUBLIC_PB_SUBDOMAIN,
  PUBLIC_APP_DOMAIN,
  PUBLIC_APP_PROTOCOL,
  PUBLIC_PB_PROTOCOL
} = env

export const PUBLIC_POCKETHOST_VERSION = base.version
