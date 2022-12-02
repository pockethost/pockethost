import type { BaseFields, RecordId } from '@pockethost/common'
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
    logger: { dbg },
  } = config

  const watchById = safeCatch(
    `watchById`,
    async <TRec>(
      collectionName: string,
      id: RecordId,
      cb: (data: RecordSubscription<TRec>) => void,
      initialFetch = true
    ): Promise<UnsubscribeFunc> => {
      dbg(`watching ${collectionName}:${id}`)
      let hasUpdate = false

      const unsub = await client
        .collection(collectionName)
        .subscribe<TRec>(id, (e) => {
          hasUpdate = true
          dbg(`Got an update watching ${collectionName}:${id}`, e)
          cb(e)
        })
      if (initialFetch) {
        const initial = await client.collection(collectionName).getOne<TRec>(id)
        if (!initial) {
          throw new Error(`Expected ${collectionName}.${id} to exist.`)
        }
        if (!hasUpdate) {
          // No update has been sent yet, send at least one
          dbg(`Sending initial update for ${collectionName}:${id}`, initial)
          cb({ action: 'initial', record: initial })
        }
      }
      return async () => {
        dbg(`UNsubbing ${collectionName}:${id}`)
        await unsub()
      }
    }
  )

  const watchAllById = safeCatch(
    `watchAllById`,
    async <TRec extends BaseFields>(
      collectionName: string,
      idName: keyof TRec,
      idValue: RecordId,
      cb: (data: RecordSubscription<TRec>) => void,
      initialFetch = true
    ): Promise<UnsubscribeFunc> => {
      let hasUpdate: { [_: RecordId]: boolean } = {}
      const unsub = client
        .collection(collectionName)
        .subscribe<TRec>('*', (e) => {
          // console.log(e.record.instanceId, id)
          if (e.record[idName] !== idValue) return
          hasUpdate[e.record.id] = true
          cb(e)
        })
      if (initialFetch) {
        const existing = await client
          .collection(collectionName)
          .getFullList<TRec>(100, {
            filter: `${idName.toString()} = '${idValue}'`,
          })
        existing.forEach((record) => {
          if (hasUpdate[record.id]) return
          cb({ action: 'initial', record })
        })
      }
      return unsub
    }
  )

  return { watchById, watchAllById }
}
