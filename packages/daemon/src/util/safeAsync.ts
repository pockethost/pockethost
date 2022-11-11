import Bottleneck from 'bottleneck'
import { ClientResponseError } from 'pocketbase'
import { dbg, error } from './dbg'

const limiter = new Bottleneck({ maxConcurrent: 1 })

let inside = ''
export const serialAsync = <TIn extends any[], TOut>(
  name: string,
  cb: (...args: TIn) => Promise<TOut>
) => {
  const _cb = safeCatch(name, cb)

  return (...args: TIn) => {
    return limiter.schedule(() => {
      if (inside) {
        throw new Error(
          `Already in async function ${inside}, can't execute ${name}`
        )
      }
      return _cb(...args).finally(() => {
        inside = ''
      })
    })
  }
}

let c = 0
export const safeCatch = <TIn extends any[], TOut>(
  name: string,
  cb: (...args: TIn) => Promise<TOut>
) => {
  return (...args: TIn) => {
    const _c = c++
    const uuid = `${name}:${_c}`
    dbg(uuid, ...args)
    const tid = setTimeout(() => {
      error(uuid, `ERROR: timeout waiting for ${uuid}`)
    }, 100)

    inside = uuid
    return cb(...args)
      .then((res) => {
        dbg(uuid, `finished`)
        inside = ''
        clearTimeout(tid)
        return res
      })
      .catch((e: any) => {
        if (e instanceof ClientResponseError) {
          error(uuid, `PocketBase API error ${e}`)
          error(uuid, JSON.stringify(e.data, null, 2))
          if (e.status === 400) {
            error(
              uuid,
              `It looks like you don't have permission to make this request.`
            )
          }
        } else {
          error(uuid, `failed: ${e}`)
        }
        error(uuid, e)
        throw e
      })
  }
}
