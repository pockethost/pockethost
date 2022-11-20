import type { RecordId } from '@pockethost/common'
import type pocketbaseEs from 'pocketbase'
import type { RecordSubscription, UnsubscribeFunc } from 'pocketbase'
import { Logger } from '../Logger'
import { PromiseHelper } from '../PromiseHelper'

export type WatchHelperConfig = {
  client: pocketbaseEs
  promiseHelper: PromiseHelper
  logger: Logger
}

export type WatchHelper = ReturnType<typeof createWatchHelper>

export const createWatchHelper = (config: WatchHelperConfig) => {
  const {
    client,
    promiseHelper: { safeCatch },
  } = config

  const watchById = safeCatch(
    `subscribe`,
    async <TRec>(
      collectionName: string,
      id: RecordId,
      cb: (data: RecordSubscription<TRec>) => void,
      initialFetch = true
    ) => {
      const unsub = await client
        .collection(collectionName)
        .subscribe<TRec>(id, cb)
      if (initialFetch) {
        const initial = await client.collection(collectionName).getOne<TRec>(id)
        if (!initial) {
          throw new Error(`Expected ${collectionName}.${id} to exist.`)
        }
        cb({ action: 'update', record: initial })
      }
      return unsub
    }
  )

  const watchAllById = safeCatch(
    `watchAllById`,
    async <TRec>(
      collectionName: string,
      idName: keyof TRec,
      idValue: RecordId,
      cb: (data: RecordSubscription<TRec>) => void,
      initialFetch = true
    ): Promise<UnsubscribeFunc> => {
      const unsub = client
        .collection(collectionName)
        .subscribe<TRec>('*', (e) => {
          // console.log(e.record.instanceId, id)
          if (e.record[idName] !== idValue) return
          cb(e)
        })
      if (initialFetch) {
        const existing = await client
          .collection(collectionName)
          .getFullList<TRec>(100, {
            filter: `${idName.toString()} = '${idValue}'`,
          })
        existing.forEach((record) => cb({ action: 'init', record }))
      }
      return unsub
    }
  )

  return { watchById, watchAllById }
}
