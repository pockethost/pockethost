import { boolean } from 'boolean'

/**
 * These environment variables default to pointing to the production build so frontend development is easy.
 * If they are specified in .env, those values will prevail.
 */

// The domain name where this dashboard lives
export const PUBLIC_APP_URL =
  import.meta.env.PUBLIC_APP_URL || 'https://app.pockethost.io'

// The apex domain of this whole operation. Also known as the "app" or "dashboard"
export const PUBLIC_APEX_DOMAIN =
  import.meta.env.PUBLIC_APEX_DOMAIN || `pockethost.io`

// The domain name of the lander/marketing site
export const PUBLIC_BLOG_URL =
  import.meta.env.PUBLIC_BLOG_URL || 'https://pockethost.io'

// The protocol to use, almost always will be https
export const PUBLIC_HTTP_PROTOCOL =
  import.meta.env.PUBLIC_HTTP_PROTOCOL || `https:`

// The complete URL to the mothership
export const PUBLIC_MOTHERSHIP_URL =
  import.meta.env.PUBLIC_MOTHERSHIP_URL ||
  `https://pockethost-central.pockethost.io`

// Whether we are in debugging mode - default TRUE
export const PUBLIC_DEBUG = boolean(import.meta.env.PUBLIC_DEBUG || 'true')

/**
 * This helper function will take a dynamic list of values and join them together with a slash.
 * @param {Array<string>} paths This is an optional list of additional paths to append to the lander URL.
 * @example
 * mkPath('a', 'b', 'c') // a/b/c
 */
const mkPath = (...paths: string[]) => {
  return paths.filter((v) => !!v).join('/')
}

/**
 * Helpful alias for the lander url.
 * @param {Array<string>} paths This is an optional list of additional paths to append to the lander URL.
 * @example
 * LANDER_URL() // https://pockethost.io/
 * LANDER_URL('showcase') // https://pockethost.io/showcase/
 */
export const LANDER_URL = (...paths: string[]) => {
  return `${PUBLIC_BLOG_URL}/${mkPath(...paths)}/`
}

/**
 * Helpful alias for the blog url.
 * @param {Array<string>} paths This is an optional list of additional paths to append to the blogs URL.
 * @example
 * BLOG_URL() // https://pockethost.io/blog
 * BLOG_URL('new-features-2023') // https://pockethost.io/blog/new-features-2023/
 */
export const BLOG_URL = (...paths: string[]) => {
  return LANDER_URL(`blog`, ...paths)
}

/**
 * Helpful alias for the docs url.
 * @param {Array<string>} paths This is an optional list of additional paths to append to the docs URL.
 * @example
 * DOCS_URL() // https://pockethost.io/docs
 * DOCS_URL('overview', 'help') // https://pockethost.io/docs/overview/help/
 */
export const DOCS_URL = (...paths: string[]) => {
  return LANDER_URL(`docs`, ...paths)
}

/**
 * Helpful alias for the app url.
 * @param {Array<string>} paths This is an optional list of additional paths to append to the app URL.
 * @example
 * APP_URL() // https://app.pockethost.io/
 * APP_URL('dashboard') // https://app.pockethost.io/dashboard
 */
export const APP_URL = (...paths: string[]) => {
  return `${PUBLIC_APP_URL}/${mkPath(...paths)}`
}

/**
 * Helpful alias for generating the URL for a specific instance
 * @param {string} name This is the unique instance name
 * @param {Array<string>} paths This is an optional list of additional paths to append to the instance URL.
 * @example
 * INSTANCE_URL('my-cool-instance') // https://my-cool-instance.pockethost.io/
 * INSTANCE_URL('my-cool-instance', 'dashboard') // https://my-cool-instance.pockethost.io/dashboard
 */
export const INSTANCE_URL = (name: string, ...paths: string[]) => {
  return `${PUBLIC_HTTP_PROTOCOL}//${name}.${PUBLIC_APEX_DOMAIN}/${mkPath(
    ...paths,
  )}`
}

/**
 * Helpful alias for generating the URL for a specific instance's admin panel
 * @param {string} name This is the unique instance name
 * @example
 * INSTANCE_ADMIN_URL('my-cool-instance') // https://my-cool-instance.pockethost.io/_/
 */
export const INSTANCE_ADMIN_URL = (name: string) => {
  return INSTANCE_URL(name, `_/`)
}

export const FTP_URL = (email: string) => {
  return `"${email}"@ftp.sfo-1.${PUBLIC_APEX_DOMAIN}`
}

export const DISCORD_URL = `https://discord.gg/HsSjcuPRWX`
