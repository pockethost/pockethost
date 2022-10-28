import { client } from '../client'
import {
  Pb_Any_Record_Db,
  Pb_CollectionName,
  Pb_PkId,
  Pb_Untrusted_Db,
} from '../schema/base'

export const createRealtimeSubscriptionManager = () => {
  const subscriptions: { [_: string]: number } = {}

  const subscribe = <TRec extends Pb_Any_Record_Db>(
    collectionName: Pb_CollectionName,
    cb: (rec: Pb_Untrusted_Db<TRec>) => void,
    id?: Pb_PkId
  ) => {
    const slug = id ? `${collectionName}/${id}` : collectionName

    if (subscriptions[slug]) {
      subscriptions[slug]++
    } else {
      subscriptions[slug] = 1
      client.realtime.subscribe(slug, (e) => {
        console.log(`Realtime update`, { e })
        cb(e.record as unknown as Pb_Untrusted_Db<TRec>)
      })
    }
    return () => {
      subscriptions[slug]--
      if (subscriptions[slug] === 0) {
        console.log(`Realtime unsub`)
        client.realtime.unsubscribe(slug)
      }
    }
  }

  return subscribe
}
