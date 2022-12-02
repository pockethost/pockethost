import { ClientResponseError } from 'pocketbase'
import { Logger } from './Logger'

export type PromiseHelperConfig = {
  logger: Logger
}

export type PromiseHelper = ReturnType<typeof createPromiseHelper>

export const createPromiseHelper = (config: PromiseHelperConfig) => {
  const { logger } = config
  const { dbg, error, warn } = logger

  let inside = ''
  let c = 0
  const safeCatch = <TIn extends any[], TOut>(
    name: string,
    cb: (...args: TIn) => Promise<TOut>
  ) => {
    return (...args: TIn) => {
      const _c = c++
      const uuid = `${name}:${_c}`
      const pfx = `[safeCatch:${uuid}]`
      // dbg(uuid, ...args)
      const tid = setTimeout(() => {
        warn(pfx, `timeout waiting for ${pfx}`)
      }, 100)

      inside = pfx
      return cb(...args)
        .then((res) => {
          // dbg(uuid, `finished`)
          inside = ''
          clearTimeout(tid)
          return res
        })
        .catch((e: any) => {
          error(pfx, JSON.stringify(e, null, 2))
          if (e instanceof ClientResponseError) {
            if (e.status === 400) {
              error(
                pfx,
                `PocketBase API error: It looks like you don't have permission to make this request.`
              )
            } else {
              error(pfx, `Unknown PocketBase API error`)
            }
          }
          throw e
        })
    }
  }

  return { safeCatch }
}
