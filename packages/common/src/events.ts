import { values } from '@s-libs/micro-dash'

export type Unsubscribe = () => void

export type EventSubscriber<TPayload> = (
  cb: EventHandler<TPayload>
) => Unsubscribe
export type EventEmitter<TPayload> = (
  payload: TPayload,
  stopOnHandled?: boolean
) => Promise<boolean>
export type EventHandler<TPayload> = (
  payload: TPayload,
  isHandled: boolean
) => boolean | void | Promise<boolean | void>

/**
 *
 * @param defaultHandler Optional handler to call if no handler calls `handled()`
 * @returns void
 */
export const createEvent = <TPayload>(
  defaultHandler?: EventHandler<TPayload>
): [EventSubscriber<TPayload>, EventEmitter<TPayload>] => {
  let i = 0
  const callbacks: any = {}
  let callbacksArray: EventHandler<TPayload>[] = []
  const onEvent = (cb: EventHandler<TPayload>) => {
    const id = i++
    callbacks[id] = cb
    callbacksArray = values(callbacks)
    return () => {
      delete callbacks[id]
    }
  }

  const fireEvent = async (payload: TPayload, stopOnHandled = false) => {
    let _handled = false
    for (let i = 0; i < callbacksArray.length; i++) {
      const cb = callbacksArray[i]
      if (!cb) continue
      const res: boolean = !!(await cb(payload, _handled))
      _handled = _handled || res
      if (stopOnHandled && _handled) break
    }
    if (!_handled) {
      await defaultHandler?.(payload, false)
    }
    return _handled
  }

  return [onEvent, fireEvent]
}
