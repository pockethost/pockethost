import { forEach, reduce } from '@s-libs/micro-dash'

export type Unsubscribe = () => void

export const createGenericAsyncEvent = <TPayload>(): [
  (cb: (payload: TPayload) => Promise<void>) => Unsubscribe,
  (payload: TPayload) => Promise<void>
] => {
  let i = 0
  const callbacks: any = {}
  const onEvent = (cb: (payload: TPayload) => Promise<void>) => {
    const id = i++
    callbacks[id] = cb
    return () => {
      delete callbacks[id]
    }
  }

  const fireEvent = (payload: TPayload) =>
    reduce(
      callbacks,
      (c, cb) => {
        return c.then(cb(payload))
      },
      Promise.resolve()
    )

  return [onEvent, fireEvent]
}

export const createGenericSyncEvent = <TPayload>(): [
  (cb: (payload: TPayload) => void) => Unsubscribe,
  (payload: TPayload) => void
] => {
  let i = 0
  const callbacks: any = {}
  const onEvent = (cb: (payload: TPayload) => void) => {
    const id = i++
    callbacks[id] = cb
    return () => {
      delete callbacks[id]
    }
  }

  const fireEvent = (payload: TPayload) => {
    forEach(callbacks, (cb) => cb(payload))
  }

  return [onEvent, fireEvent]
}
