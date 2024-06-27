import { Bottleneck } from 'pockethost/core'
import { stringify } from 'pockethost/src/common'
import { DUPLICATE_ALERT_MS } from '.'

const cache: { [_: string]: NodeJS.Timeout } = {}

function splitIntoChunks(lines: string[], maxChars: number = 2000): string[] {
  const chunks: string[] = []
  let currentChunk: string = ''

  lines.forEach((line) => {
    // Check if adding the next line exceeds the maxChars limit
    if (currentChunk.length + line.length + 1 > maxChars) {
      chunks.push(currentChunk)
      currentChunk = ''
    }
    currentChunk += line + '\n' // Add the line and a newline character
  })

  // Add the last chunk if it's not empty
  if (currentChunk) {
    chunks.push(currentChunk)
  }

  return chunks
}

const limiter = new Bottleneck({ maxConcurrent: 1 })

export const send = (url: string, lines: string[]) =>
  Promise.all(
    splitIntoChunks(lines).map((content) =>
      limiter.schedule(() =>
        fetch(url, {
          method: 'POST',
          body: stringify({
            content,
          }),
          headers: { 'content-type': 'application/json' },
        }),
      ),
    ),
  )

export const alert = (url: string, message: { toString: () => string }) => {
  if (!url) return
  const m = message.toString()
  const isCached = !!cache[m]
  if (isCached) {
    clearTimeout(cache[m])
  }
  cache[m] = setTimeout(() => {
    delete cache[message.toString()]
  }, DUPLICATE_ALERT_MS())
  if (isCached) return

  send(url, [message.toString()]).catch(console.error)
}
