import { createNanoEvents } from 'nanoevents'

const emitter = createNanoEvents()

export type Event<TPayload extends any = void> = TPayload

export type EventListenerCallback<TEvent extends Event<any>> = (
  event: TEvent
) => void

export type EventDispatcher<TEvent extends Event<any> = Event> = (
  event: TEvent
) => void

export type EventUnsubscriber = () => void

export type EventSubscriber<TEvent extends Event<any>> = (
  callback: EventListenerCallback<TEvent>
) => EventUnsubscriber

export const createEvent = <TEvent extends Event<any>>(
  eventName: string
): [EventSubscriber<TEvent>, EventDispatcher<TEvent>] => {
  const fire: EventDispatcher<TEvent> = (event) => {
    emitter.emit(eventName, event)
  }

  const listen: EventSubscriber<TEvent> = (cb) => {
    const unsub = emitter.on(eventName, cb)
    return unsub
  }

  return [listen, fire]
}
