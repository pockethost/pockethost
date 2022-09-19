import { pocketbase } from './pocketbase'
import { Any_Record_Out } from './schema'

export const createRealtimeSubscriptionManager = () => {
  const subscriptions: { [_: string]: number } = {}

  const subscribe = <TRec extends Any_Record_Out>(
    slug: string,
    cb: (rec: TRec) => void
  ) => {
    if (subscriptions[slug]) {
      subscriptions[slug]++
    } else {
      subscriptions[slug] = 1
      pocketbase.realtime.subscribe(slug, (e) => {
        console.log(`Realtime update`, { e })
        cb(e.record as unknown as TRec)
      })
    }
    return () => {
      subscriptions[slug]--
      if (subscriptions[slug] === 0) {
        pocketbase.realtime.unsubscribe(slug)
      }
    }
  }

  return subscribe
}
