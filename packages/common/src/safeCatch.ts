import chalk from 'chalk'
import { nanoid } from 'nanoid'
import { ClientResponseError } from 'pocketbase'
import { Logger } from './Logger'

const SAFECATCH_TTL_MS = 5000

export const safeCatch = <TIn extends any[], TOut>(
  name: string,
  logger: Logger,
  cb: (...args: TIn) => Promise<TOut>,
  timeoutMs = SAFECATCH_TTL_MS
): ((...args: TIn) => Promise<TOut>) => {
  return async (...args: TIn) => {
    const uuid = `${name}:${nanoid()}`
    const pfx = chalk.red(`safeCatch:${uuid}`)
    const { raw, error, warn, dbg } = logger.create(pfx)
    raw(`args`, args)
    const tid = setTimeout(() => {
      warn(`timeout ${timeoutMs}ms waiting for ${pfx}`)
    }, timeoutMs)

    try {
      const res = await cb(...args)
      raw(`finished`)
      return res
    } catch (e) {
      const payload = JSON.stringify(args)
      if (e instanceof ClientResponseError) {
        if (e.status === 400) {
          dbg(
            `PocketBase API error: It looks like you don't have permission to make this request. Raw error: ${e}. Payload: ${payload}`
          )
        } else if (e.status === 0) {
          dbg(
            `Client request aborted (possible duplicate request or real error). Raw error: ${e}. Payload: ${payload}`
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
    } finally {
      clearTimeout(tid)
    }
  }
}
