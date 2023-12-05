if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env' })
}

/**
 * These environment variables default to pointing to the production build so frontend development is easy.
 * If they are specified in .env, those values will prevail.
 */

const env = {
  // The domain name where this dashboard lives
  PUBLIC_APP_URL: process.env.PUBLIC_APP_URL || 'https://app.pockethost.io',

  PUBLIC_BLOG_URL: process.env.PUBLIC_BLOG_URL || 'https://pockethost.io',

  PUBLIC_DISCORD_URL: `https://discord.gg/HsSjcuPRWX`,
}

module.exports = env
