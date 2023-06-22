import { logger } from '@pockethost/common'
import { uniqueId } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { SetReturnType } from 'type-fest'

const limiters: { [lane: string]: Bottleneck } = {}
export const serialAsyncExecutionGuard = <
  T extends (...args: any[]) => Promise<any>
>(
  cb: T,
  lane?: SetReturnType<T, string>
): T => {
  const uuid = uniqueId()
  const _lane = lane || (() => uuid)
  const wrapper = (...args: Parameters<T>) => {
    const { dbg } = logger().create('serialAsyncExecutionGuard')
    const key = _lane(...args)
    if (!limiters[key]) {
      dbg(`New serial limiter with key ${key}`)
      limiters[key] = new Bottleneck({ maxConcurrent: 1 })
    }
    const limiter = limiters[key]!
    return limiter.schedule(() => cb(...args)) as unknown as ReturnType<T>
  }
  return wrapper as unknown as T
}

const singletons: { [_: string]: Promise<any> } = {}
export const singletonAsyncExecutionGuard = <
  T extends (...args: any[]) => Promise<any>
>(
  cb: T,
  key: SetReturnType<T, string>
): T => {
  const uuid = uniqueId()
  const keyFactory = key || (() => uuid)
  const wrapper = (...args: Parameters<T>) => {
    const { dbg } = logger().create(`singletonAsyncExecutionGuard`)
    const key = keyFactory(...args)
    if (singletons[key]) {
      return singletons[key] as unknown as ReturnType<T>
    }
    dbg(`New singleton guard with key ${key}`)
    singletons[key] = cb(...args)
    return singletons[key] as unknown as ReturnType<T>
  }
  return wrapper as unknown as T
}
