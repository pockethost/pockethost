import { logger as defaultLogger } from '@pockethost/common'
import fetch from 'node-fetch'
import { AsyncContext } from './AsyncContext'

export const TRYFETCH_RETRY_MS = 50

export type Config = Required<AsyncContext> & {
  preflight: () => Promise<boolean>
  retryMs: number
}

export const tryFetch = async (url: string, config?: Partial<Config>) => {
  const { logger, preflight, retryMs }: Config = {
    logger: defaultLogger(),
    preflight: async () => true,
    retryMs: TRYFETCH_RETRY_MS,
    ...config,
  }
  const _logger = logger.create(`tryFetch`)
  const { dbg } = _logger
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
          `Could not fetch ${url}, trying again in ${retryMs}ms. Raw error ${e}`
        )
        setTimeout(tryFetch, retryMs)
      }
    }
    tryFetch()
  })
}
