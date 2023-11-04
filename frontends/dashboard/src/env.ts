import { boolean } from 'boolean'

/**
 * These environment variables default to pointing to the production build so frontend development is easy.
 * If they are specified in .env, those values will prevail.
 */

// The domain name where this dashboard lives
export const PUBLIC_APP_URL =
  import.meta.env.PUBLIC_APP_URL || 'https://app.pockethost.io'

// The apex domain of this whole operation
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

// Whether or not we are in debugging mode - default TRUE
export const PUBLIC_DEBUG = boolean(import.meta.env.PUBLIC_DEBUG || 'true')

// Derived
export const LANDER_URL = (path = '') => `${PUBLIC_BLOG_URL}/${path}`
export const BLOG_URL = (path = '') => LANDER_URL(`blog/${path}`)
export const DOCS_URL = (path = '') => LANDER_URL(`docs/${path}`)
export const APP_URL = (path = '') => `${PUBLIC_APP_URL}/${path}`
export const INSTANCE_URL = (name: string, path = '') =>
  `${PUBLIC_HTTP_PROTOCOL}//${name}.${PUBLIC_APEX_DOMAIN}/${path}`
export const INSTANCE_ADMIN_URL = (name: string, path = '') =>
  INSTANCE_URL(name, `_/${path}`)
export const FTP_URL = (email: string) =>
  `ftp://${encodeURIComponent(email)}@ftp.sfo-1.${PUBLIC_APEX_DOMAIN}`

console.log({
  PUBLIC_APEX_DOMAIN,
  PUBLIC_APP_URL,
  PUBLIC_BLOG_URL,
  PUBLIC_DEBUG,
  PUBLIC_HTTP_PROTOCOL,
  PUBLIC_MOTHERSHIP_URL,
})
