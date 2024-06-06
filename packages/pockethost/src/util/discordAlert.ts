import { DISCORD_ALERT_CHANNEL_URL } from '$constants'
import { stringify } from '$public'

const cache: { [_: string]: NodeJS.Timeout } = {}

export const discordAlert = (message: { toString: () => string }) => {
  const url = DISCORD_ALERT_CHANNEL_URL()
  if (!url) return
  const m = message.toString()
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
