import { Logger, safeCatch } from '@pockethost/common'

const TRYFETCH_RETRY_MS = 50
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
            try {
              const shouldFetch = await preflight()
              if (!shouldFetch) {
                reject(new Error(`failed preflight, aborting`))
                return
              }
            } catch (e) {
              reject(new Error(`preflight threw error, aborting`))
              return
            }
          }
          try {
            dbg(`Trying to fetch ${url} `)
            const res = await fetch(url)
            dbg(`Fetch ${url} successful`)
            resolve()
          } catch (e) {
            dbg(
              `Could not fetch ${url}, trying again in ${TRYFETCH_RETRY_MS}ms. Raw error ${e}`
            )
            setTimeout(tryFetch, TRYFETCH_RETRY_MS)
          }
        }
        tryFetch()
      })
    }
  )
