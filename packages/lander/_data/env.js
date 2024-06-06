/**
 * These environment variables default to pointing to the production build so
 * frontend development is easy. If they are specified in .env, those values
 * will prevail.
 */

const PUBLIC_APEX_DOMAIN = process.env.PUBLIC_APEX_DOMAIN || 'pockethost.lvh.me'

const env = {
  // The domain name where this dashboard lives
  PUBLIC_APP_URL:
    process.env.PUBLIC_APP_URL || `https://app.${PUBLIC_APEX_DOMAIN}`,

  PUBLIC_BLOG_URL:
    process.env.PUBLIC_BLOG_URL || `https://${PUBLIC_APEX_DOMAIN}`,

  PUBLIC_DISCORD_URL: `https://discord.gg/HsSjcuPRWX`,
}

module.exports = env
