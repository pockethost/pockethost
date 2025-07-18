import { stringify } from '@'
import { DISCORD_ALERT_CHANNEL_URL } from '.'

const cache: { [_: string]: NodeJS.Timeout } = {}

export const discordAlert = (message: { toString: () => string }, _url?: string) => {
  const url = _url || DISCORD_ALERT_CHANNEL_URL()
  if (!url) return
  const m = `${message}${message instanceof Error ? `\n${message.stack}` : ''}`
  const isCached = !!cache[m]
  if (isCached) {
    clearTimeout(cache[m])
  }
  cache[m] = setTimeout(() => {
    delete cache[message.toString()]
  }, 60 * 1000)
  if (isCached) return

  fetch(url, {
    method: 'POST',
    body: stringify({
      content: message.toString(),
    }),
    headers: { 'Content-Type': 'application/json' },
  }).catch(console.error)
}
