import PocketBase, { Record } from 'pocketbase'
import { CollectionName, RecordId } from './schema'

export interface RecordSubscription<T = Record> {
  action: string
  record: T
}

export type RealtimeEventHandler<TRec> = (e: RecordSubscription<TRec>) => void

export const createRealtimeSubscriptionManager = (pocketbase: PocketBase) => {
  const subscriptions: { [_: string]: number } = {}

  const subscribeOne = <TRec>(
    collection: CollectionName,
    id: RecordId,
    cb: (e: RecordSubscription<TRec>) => void
  ) => {
    const slug = `${collection}/${id}`
    if (subscriptions[slug]) {
      subscriptions[slug]++
    } else {
      subscriptions[slug] = 1
      pocketbase.collection(collection).subscribeOne<TRec>(id, (e) => {
        console.log(`Realtime update`, { e })
        cb(e)
      })
    }
    return () => {
      subscriptions[slug]--
      if (subscriptions[slug] === 0) {
        pocketbase.collection(collection).unsubscribe(id)
      }
    }
  }

  return { subscribeOne }
}
