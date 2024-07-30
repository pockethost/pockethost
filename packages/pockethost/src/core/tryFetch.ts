import fetch, { Response } from 'node-fetch'
import { LoggerService } from '../common'

export const TRYFETCH_RETRY_MS = 50
export const TRYFETCH_TIMEOUT_MS = 500

export type TryFetchConfig = {
  preflight: () => Promise<boolean>
  retryMs: number
  timeoutMs: number
}

/**
 * @param url The URL to fetch
 * @param config { preflight: ()=>Promise<boolean>, retryMs: number}
 * @returns Promise<Response>
 *
 *   TryFetch will contiously try to fetch a URL every `retryMs`, with an optinoal
 *   `preflight`. If `preflight` is specificed, it must resolve to `true` before
 *   tryFetch will attempt to fetch the URL. If `preflight` resolves to `false`,
 *   tryFetch will delay by `retryMs` and then check again. If `preflight`
 *   rejects, then tryFetch rejects and exits.
 *
 *   Note: tryFetch exits ONLY on success or a rejected preflight.
 */
export const tryFetch = async (
  url: string,
  config?: Partial<TryFetchConfig>,
) => {
  const { preflight, retryMs, timeoutMs }: TryFetchConfig = {
    preflight: async () => true,
    retryMs: TRYFETCH_RETRY_MS,
    timeoutMs: TRYFETCH_TIMEOUT_MS,
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
        const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
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
