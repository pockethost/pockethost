const { boolean } = require('boolean')

/**
 * These environment variables default to pointing to the production build so frontend development is easy.
 * If they are specified in .env, those values will prevail.
 */

const env = {
  // The domain name of the lander/marketing site
  PUBLIC_BLOG_DOMAIN: process.env.PUBLIC_BLOG_DOMAIN || 'pockethost.io',

  // The domain name where this dashboard lives
  PUBLIC_APP_DOMAIN: process.env.PUBLIC_APP_DOMAIN || 'app.pockethost.io',

  // The domain name apex where all instances live (eg, <subdomain>.pockethost.io)
  PUBLIC_EDGE_APEX_DOMAIN:
    process.env.PUBLIC_EDGE_APEX_DOMAIN || 'pockethost.io',

  // The protocol to use, almost always will be https
  PUBLIC_HTTP_PROTOCOL: process.env.PUBLIC_HTTP_PROTOCOL || 'https',

  // The complete URL to the mothership
  PUBLIC_MOTHERSHIP_NAME:
    process.env.PUBLIC_MOTHERSHIP_NAME || `pockethost-central`,

  // Whether or not we are in debugging mode - default TRUE
  PUBLIC_DEBUG: boolean(process.env.PUBLIC_DEBUG || 'true'),
}

// Derived values
env.APP_URL = `${env.PUBLIC_HTTP_PROTOCOL}://${env.PUBLIC_APP_DOMAIN}`
env.BLOG_URL = `${env.PUBLIC_HTTP_PROTOCOL}://${env.PUBLIC_BLOG_DOMAIN}`
env.MOTHERSHIP_URL = `${env.PUBLIC_HTTP_PROTOCOL}://${env.PUBLIC_MOTHERSHIP_NAME}.${this.PUBLIC_EDGE_APEX_DOMAIN}`

module.exports = env
