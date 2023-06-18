import chalk from 'chalk'
import { ClientResponseError } from 'pocketbase'
import { Logger } from './Logger'

let c = 0
export const safeCatch = <TIn extends any[], TOut>(
  name: string,
  logger: Logger,
  cb: (...args: TIn) => Promise<TOut>,
  timeoutMs = 5000
) => {
  return (...args: TIn) => {
    const _c = c++
    const uuid = `${name}:${_c}`
    const pfx = chalk.red(`safeCatch:${uuid}`)
    const { raw, error, warn, dbg } = logger.create(pfx)
    raw(`args`, args)
    const tid = setTimeout(() => {
      warn(`timeout ${timeoutMs}ms waiting for ${pfx}`)
    }, timeoutMs)

    return cb(...args)
      .then((res) => {
        raw(`finished`)
        clearTimeout(tid)
        return res
      })
      .catch((e: any) => {
        const payload = JSON.stringify(args)
        if (e instanceof ClientResponseError) {
          if (e.status === 400) {
            dbg(
              `PocketBase API error: It looks like you don't have permission to make this request. Raw error: ${e}. Payload: ${payload}`
            )
          } else if (e.status === 0) {
            dbg(
              `Client request aborted (duplicate). Raw error: ${e}. Payload: ${payload}`
            )
          } else if (e.status === 404) {
            dbg(`Record not found. Raw error: ${e}. Payload: ${payload}`)
          } else {
            dbg(
              `Unknown PocketBase API error. Raw error: ${e}. Payload: ${payload}`
            )
          }
        } else {
          dbg(`Caught an unknown error. Raw error: ${e}. Payload: ${payload}`)
        }
        throw e
      })
      .finally(() => {
        clearTimeout(tid)
      })
  }
}
