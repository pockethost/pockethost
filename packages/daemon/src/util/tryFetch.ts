import { Logger, safeCatch } from '@pockethost/common'

export const tryFetch = (logger: Logger) =>
  safeCatch(
    `tryFetch`,
    logger,
    (url: string, preflight?: () => Promise<boolean>) => {
      const { dbg } = logger.create('tryFetch')
      return new Promise<void>((resolve, reject) => {
        const tryFetch = async () => {
          if (preflight) {
            dbg(`Checking preflight`)
            const shouldFetch = await preflight()
            if (!shouldFetch) {
              reject(new Error(`tryFetch failed preflight, aborting`))
              return
            }
          }
          try {
            dbg(`Trying to fetch ${url} `)
            const res = await fetch(url)
            dbg(`Fetch ${url} successful`)
            resolve()
          } catch (e) {
            dbg(`Could not fetch ${url}, trying again in 1s`)
            setTimeout(tryFetch, 1000)
          }
        }
        tryFetch()
      })
    }
  )
