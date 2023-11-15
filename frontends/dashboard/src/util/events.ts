import { forEach } from '@s-libs/micro-dash'

export type Unsubscribe = () => void

export const createGenericSyncEvent = <TPayload>(): [
  (cb: (payload: TPayload) => void) => Unsubscribe,
  (payload: TPayload) => void,
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
