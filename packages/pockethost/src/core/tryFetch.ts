import fetch, { RequestInit, Response } from 'node-fetch'
import { LoggerService } from '../common'

export const TRYFETCH_RETRY_MS = 50

export type TryFetchConfig = {
  preflight: () => Promise<boolean>
  retryMs: number
} & RequestInit

/**
 * @param url The URL to fetch
 * @param config { preflight: ()=>Promise<boolean>, retryMs: number}
 * @returns Promise<Response>
 *
 *   TryFetch will continuously try to fetch a URL every `retryMs`, with an
 *   optional `preflight`. If `preflight` is specified, it must resolve to
 *   `true` before tryFetch will attempt to fetch the URL. If `preflight`
 *   resolves to `false`, tryFetch will delay by `retryMs` and then check again.
 *   If `preflight` rejects, then tryFetch rejects and exits.
 *
 *   Note: tryFetch exits ONLY on success or a rejected preflight.
 */
export const tryFetch = async (
  url: string,
  config?: Partial<TryFetchConfig>,
) => {
  const { preflight, retryMs }: TryFetchConfig = {
    preflight: async () => true,
    retryMs: TRYFETCH_RETRY_MS,
    ...config,
  }
  const logger = LoggerService().create(`tryFetch`).breadcrumb(url)
  const { dbg } = logger
  return new Promise<Response>((resolve, reject) => {
    const again = () => setTimeout(_real_tryFetch, retryMs)
    const _real_tryFetch = async () => {
      if (preflight) {
        try {
          dbg(`Preflight: CHECK`)
          const shouldFetch = await preflight()
          if (!shouldFetch) {
            dbg(`Preflight: NOT READY`)
            again()
            return
          }
          dbg(`Preflight: READY`)
        } catch (e) {
          dbg(`Preflight: ABORT`)
          reject(e)
          return
        }
      }
      try {
        dbg(`Fetch: START`)
        const res = await fetch(url, {
          ...config,
          signal: AbortSignal.timeout(500),
        })
        dbg(`Fetch: SUCCESS`)
        resolve(res)
      } catch (e) {
        dbg(`Fetch: ERROR: trying again in ${retryMs}ms | ${e}`)
        again()
      }
    }
    _real_tryFetch()
  })
}
