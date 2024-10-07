import { boolean } from 'boolean'
import { InstanceFields, SubscriptionType } from 'pockethost/common'

/**
 * These environment variables default to pointing to the production build so
 * frontend development is easy. If they are specified in .env, those values
 * will prevail.
 */

// The apex domain of this whole operation.
export const PUBLIC_APEX_DOMAIN =
  import.meta.env.PUBLIC_APEX_DOMAIN || `pockethost.io`

export const PUBLIC_APP_URL =
  import.meta.env.PUBLIC_APP_URL || `https://${PUBLIC_APEX_DOMAIN}`

// The protocol to use, almost always will be https
export const PUBLIC_HTTP_PROTOCOL =
  import.meta.env.PUBLIC_HTTP_PROTOCOL || `https:`

// The complete URL to the mothership
export const PUBLIC_MOTHERSHIP_URL =
  import.meta.env.PUBLIC_MOTHERSHIP_URL ||
  `https://pockethost-central.${PUBLIC_APEX_DOMAIN}`

// Whether we are in debugging mode - default TRUE
export const PUBLIC_DEBUG = boolean(import.meta.env.PUBLIC_DEBUG || 'true')

const mkPath = (...paths: string[]) => {
  return paths.filter((v) => !!v).join('/')
}

export const MAX_INSTANCE_COUNTS = {
  [SubscriptionType.Free]: 25,
  [SubscriptionType.Legacy]: 25,
  [SubscriptionType.Lifetime]: 999,
  [SubscriptionType.Premium]: 250,
}
export const FREE_MAX_INSTANCE_COUNT = 25

export const APP_URL = (...paths: string[]) => {
  return `${PUBLIC_APP_URL}/${mkPath(...paths)}`
}

export const INSTANCE_BARE_HOST = (instance: InstanceFields) => {
  return `${instance.subdomain}.${PUBLIC_APEX_DOMAIN}`
}

export const INSTANCE_HOST = (instance: InstanceFields) => {
  return instance.cname || INSTANCE_BARE_HOST(instance)
}

/**
 * Helpful alias for generating the URL for a specific instance
 *
 * @example
 *   INSTANCE_URL('my-cool-instance') // https://my-cool-instance.pockethost.io/
 *   INSTANCE_URL('my-cool-instance', 'dashboard') // https://my-cool-instance.pockethost.io/dashboard
 *
 * @param {string} instance This is the unique instance name
 * @param {string[]} paths This is an optional list of additional paths to
 *   append to the instance URL.
 */
export const INSTANCE_URL = (instance: InstanceFields, ...paths: string[]) => {
  return `${PUBLIC_HTTP_PROTOCOL}//${INSTANCE_HOST(instance)}/${mkPath(
    ...paths,
  )}`
}

/**
 * Helpful alias for generating the URL for a specific instance's admin panel
 *
 * @example
 *   INSTANCE_ADMIN_URL('my-cool-instance') // https://my-cool-instance.pockethost.io/_/
 *
 * @param {string} name This is the unique instance name
 */
export const INSTANCE_ADMIN_URL = (instance: InstanceFields) => {
  return INSTANCE_URL(instance, `_/`)
}

export const FTP_URL = (email: string) => {
  return `"${email}"@ftp.${PUBLIC_APEX_DOMAIN}:21`
}

export const DISCORD_URL = `https://discord.gg/HsSjcuPRWX`
