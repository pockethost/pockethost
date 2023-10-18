import { boolean } from 'boolean'

/**
 * These environment variables default to pointing to the production build so frontend development is easy.
 * If they are specified in .env, those values will prevail.
 */

// The domain name of the lander/marketing site
export const PUBLIC_BLOG_DOMAIN =
  import.meta.env.PUBLIC_BLOG_DOMAIN || 'pockethost.io'

// The domain name where this dashboard lives
export const PUBLIC_APP_DOMAIN =
  import.meta.env.PUBLIC_APP_DOMAIN || 'app.pockethost.io'

// The domain name apex where all instances live (eg, <subdomain>.pockethost.io)
export const PUBLIC_EDGE_APEX_DOMAIN =
  import.meta.env.PUBLIC_EDGE_APEX_DOMAIN || 'pockethost.io'

// The protocol to use, almost always will be https
export const PUBLIC_HTTP_PROTOCOL =
  import.meta.env.PUBLIC_HTTP_PROTOCOL || 'https'

// The complete URL to the mothership
export const PUBLIC_MOTHERSHIP_NAME =
  import.meta.env.PUBLIC_MOTHERSHIP_NAME || `pockethost-central`

// Whether or not we are in debugging mode - default TRUE
export const PUBLIC_DEBUG = boolean(import.meta.env.PUBLIC_DEBUG || 'true')

// Derived
export const MOTHERSHIP_URL = `${PUBLIC_HTTP_PROTOCOL}://${PUBLIC_MOTHERSHIP_NAME}.${PUBLIC_EDGE_APEX_DOMAIN}`
export const WWW_URL = (path = '') =>
  `${PUBLIC_HTTP_PROTOCOL}://${PUBLIC_BLOG_DOMAIN}/${path}`
export const BLOG_URL = (path = '') => WWW_URL(`blog/${path}`)
export const DOCS_URL = (path = '') => WWW_URL(`docs/${path}`)
export const APP_URL = (path = '') =>
  `${PUBLIC_HTTP_PROTOCOL}://${PUBLIC_APP_DOMAIN}/${path}`
export const INSTANCE_URL = (name: string, path = '') =>
  `${PUBLIC_HTTP_PROTOCOL}://${name}.${PUBLIC_EDGE_APEX_DOMAIN}/${path}`
export const INSTANCE_ADMIN_URL = (name: string, path = '') =>
  INSTANCE_URL(name, `_/${path}`)
export const FTP_URL = (email: string) =>
  `ftp://${encodeURIComponent(email)}@ftp.sfo-1.${PUBLIC_EDGE_APEX_DOMAIN}`
