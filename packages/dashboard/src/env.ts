import { InstanceFields } from '@pockethost/common'
import { boolean } from 'boolean'

/**
 * These environment variables default to pointing to the production build so
 * frontend development is easy. If they are specified in .env, those values
 * will prevail.
 */

// The apex domain of this whole operation.
export const PUBLIC_APEX_DOMAIN =
  import.meta.env.PUBLIC_APEX_DOMAIN || `pockethost.lvh.me`

// The domain name where this dashboard lives
export const PUBLIC_APP_URL =
  import.meta.env.PUBLIC_APP_URL || `https://app.${PUBLIC_APEX_DOMAIN}`

// The domain name of the lander/marketing site
export const PUBLIC_BLOG_URL =
  import.meta.env.PUBLIC_BLOG_URL || `https://${PUBLIC_APEX_DOMAIN}`

// The protocol to use, almost always will be https
export const PUBLIC_HTTP_PROTOCOL =
  import.meta.env.PUBLIC_HTTP_PROTOCOL || `https:`

// The complete URL to the mothership
export const PUBLIC_MOTHERSHIP_URL =
  import.meta.env.PUBLIC_MOTHERSHIP_URL ||
  `https://pockethost-central.${PUBLIC_APEX_DOMAIN}`

// Whether we are in debugging mode - default TRUE
export const PUBLIC_DEBUG = boolean(import.meta.env.PUBLIC_DEBUG || 'true')

/**
 * This helper function will take a dynamic list of values and join them
 * together with a slash.
 *
 * @example
 *   mkPath('a', 'b', 'c') // a/b/c
 *
 * @param {string[]} paths This is an optional list of additional paths to
 *   append to the lander URL.
 */
const mkPath = (...paths: string[]) => {
  return paths.filter((v) => !!v).join('/')
}

/**
 * Helpful alias for the lander url.
 *
 * @example
 *   LANDER_URL() // https://pockethost.io/
 *   LANDER_URL('showcase') // https://pockethost.io/showcase/
 *
 * @param {string[]} paths This is an optional list of additional paths to
 *   append to the lander URL.
 */
export const LANDER_URL = (...paths: string[]) => {
  return `${PUBLIC_BLOG_URL}/${mkPath(...paths)}`
}

/**
 * Helpful alias for the blog url.
 *
 * @example
 *   BLOG_URL() // https://pockethost.io/blog
 *   BLOG_URL('new-features-2023') // https://pockethost.io/blog/new-features-2023/
 *
 * @param {string[]} paths This is an optional list of additional paths to
 *   append to the blogs URL.
 */
export const BLOG_URL = (...paths: string[]) => {
  return LANDER_URL(`blog`, ...paths)
}

/**
 * Helpful alias for the docs url.
 *
 * @example
 *   DOCS_URL() // https://pockethost.io/docs
 *   DOCS_URL('overview', 'help') // https://pockethost.io/docs/overview/help/
 *
 * @param {string[]} paths This is an optional list of additional paths to
 *   append to the docs URL.
 */
export const DOCS_URL = (...paths: string[]) => {
  return LANDER_URL(`docs`, ...paths)
}

/**
 * Helpful alias for the app url.
 *
 * @example
 *   APP_URL() // https://app.pockethost.io/
 *   APP_URL('dashboard') // https://app.pockethost.io/dashboard
 *
 * @param {string[]} paths This is an optional list of additional paths to
 *   append to the app URL.
 */
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
  return `"${email}"@ftp.sfo-1.${PUBLIC_APEX_DOMAIN}:21`
}

export const DISCORD_URL = `https://discord.gg/HsSjcuPRWX`
