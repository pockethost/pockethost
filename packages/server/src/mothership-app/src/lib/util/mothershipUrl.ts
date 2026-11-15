/**
 * The mothership's public base URL, for links in emails that must reach mothership routes (bulk mail unsubscribe,
 * loyalty resume). Not `settings.meta.appURL`: that is the website (https://pockethost.io), which doesn't serve
 * `/api/*`. Override with MOTHERSHIP_PUBLIC_URL.
 */
export const mothershipPublicUrl = () =>
  `${process.env.MOTHERSHIP_PUBLIC_URL || 'https://mothership.pockethost.io'}`.replace(/\/+$/, '')
