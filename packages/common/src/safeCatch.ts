import { ClientResponseError } from 'pocketbase'
import { logger } from './Logger'

let c = 0
export const safeCatch = <TIn extends any[], TOut>(
  name: string,
  cb: (...args: TIn) => Promise<TOut>
) => {
  return (...args: TIn) => {
    const _c = c++
    const uuid = `${name}:${_c}`
    const pfx = `safeCatch:${uuid}`
    const { raw, error, warn } = logger().create(pfx)
    raw(`args`, args)
    const tid = setTimeout(() => {
      warn(`timeout waiting for ${pfx}`)
    }, 100)

    return cb(...args)
      .then((res) => {
        raw(`finished`)
        clearTimeout(tid)
        return res
      })
      .catch((e: any) => {
        if (e instanceof ClientResponseError) {
          if (e.status === 400) {
            warn(
              `PocketBase API error: It looks like you don't have permission to make this request.`
            )
          } else if (e.status === 0) {
            warn(`Client request aborted (duplicate)`)
          } else {
            warn(`Unknown PocketBase API error`, JSON.stringify(e))
          }
        } else {
          warn(JSON.stringify(e, null, 2))
        }
        throw e
      })
  }
}
