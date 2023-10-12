const { boolean } = require('boolean')

/**
 * These environment variables default to pointing to the production build so frontend development is easy.
 * If they are specified in .env, those values will prevail.
 */

const env = {
  // The domain name of the lander/marketing site
  PUBLIC_BLOG_SUBDOMAIN: process.env.PUBLIC_BLOG_SUBDOMAIN || '',

  // The domain name where this dashboard lives
  PUBLIC_APP_SUBDOMAIN: process.env.PUBLIC_APP_SUBDOMAIN || 'app',

  // The domain name apex where all instances live (eg, <subdomain>.pockethost.io)
  PUBLIC_APEX_DOMAIN: process.env.PUBLIC_APEX_DOMAIN || 'pockethost.io',

  // The domain name apex where all instances live (eg, <subdomain>.pockethost.io)
  PUBLIC_EDGE_SUBDOMAIN: process.env.PUBLIC_EDGE_SUBDOMAIN || 'edge',

  // The protocol to use, almost always will be https
  PUBLIC_HTTP_PROTOCOL: process.env.PUBLIC_HTTP_PROTOCOL || 'https',

  // The complete URL to the mothership
  PUBLIC_MOTHERSHIP_SUBDOMAIN:
    process.env.PUBLIC_MOTHERSHIP_SUBDOMAIN || `pockethost-central`,

  // Whether or not we are in debugging mode - default TRUE
  PUBLIC_DEBUG: boolean(process.env.PUBLIC_DEBUG || 'true'),
}

const mkFqDomain = (subdomain) =>
  `${subdomain ? `${subdomain}.` : ''}${env.PUBLIC_APEX_DOMAIN}`
const mkUrl = (subdomain, path = '') =>
  `${env.PUBLIC_HTTP_PROTOCOL}://${mkFqDomain(subdomain)}${path}`
const mkAppUrl = (path = '') => mkUrl(env.PUBLIC_APP_SUBDOMAIN, path)
const mkBlogUrl = (path = '') => mkUrl(env.PUBLIC_BLOG_SUBDOMAIN, path)
const mkEdgeSubdomain = (subdomain) =>
  mkFqDomain(`${subdomain}.${env.PUBLIC_EDGE_SUBDOMAIN}`)
const mkEdgeUrl = (subdomain, path = '') =>
  mkUrl(mkEdgeSubdomain(subdomain), path)

// Derived values
env.APP_URL = mkAppUrl()
env.BLOG_URL = mkBlogUrl()

module.exports = env
