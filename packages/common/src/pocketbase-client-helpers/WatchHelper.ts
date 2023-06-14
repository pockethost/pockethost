import type pocketbaseEs from 'pocketbase'
import type { RecordSubscription, UnsubscribeFunc } from 'pocketbase'
import { logger } from '../Logger'
import { safeCatch } from '../safeCatch'
import { BaseFields, RecordId } from '../schema'
import { createTimerManager, UnixTimestampMs } from '../TimerManager'

export type WatchHelperConfig = {
  client: pocketbaseEs
}

export type WatchConfig = {
  initialFetch: boolean
  pollIntervalMs: UnixTimestampMs
}

export type WatchHelper = ReturnType<typeof createWatchHelper>

export const createWatchHelper = (config: WatchHelperConfig) => {
  const { client } = config

  const watchById = safeCatch(
    `watchById`,
    logger(),
    async <TRec>(
      collectionName: string,
      id: RecordId,
      cb: (data: RecordSubscription<TRec>) => void,
      options?: Partial<WatchConfig>
    ): Promise<UnsubscribeFunc> => {
      const { dbg } = logger().create(`watchById:${collectionName}:${id}`)
      const config: WatchConfig = {
        initialFetch: true,
        pollIntervalMs: 0,
        ...options,
      }
      const { initialFetch, pollIntervalMs } = config
      const tm = createTimerManager({})
      dbg(`watching ${collectionName}:${id}`)
      let pollId: ReturnType<typeof setTimeout> | undefined
      const _checkValue = async () => {
        if (hasFinished) return
        dbg(`Checking ${id} by polling`)
        try {
          const rec = await client.collection(collectionName).getOne<TRec>(id)
          if (hasFinished) return
          dbg(`Got an update polling ${collectionName}:${id}`)
          cb({ action: 'poll', record: rec })
        } catch (e) {
          dbg(`Failed to poll at interval`, e)
        } finally {
          pollId = setTimeout(_checkValue, pollIntervalMs)
        }
      }
      let hasUpdate = false
      let hasFinished = false
      if (pollIntervalMs) {
        dbg(`Configuring polling for ${pollIntervalMs}ms`)
        setTimeout(_checkValue, pollIntervalMs)
      }

      const unsub = await client
        .collection(collectionName)
        .subscribe<TRec>(id, (e) => {
          hasUpdate = true
          dbg(`Got an update watching ${collectionName}:${id}`, e)
          clearTimeout(pollId)
          if (pollIntervalMs) {
            pollId = setTimeout(_checkValue, pollIntervalMs)
          }
          cb(e)
        })
      if (initialFetch) {
        try {
          const initial = await client
            .collection(collectionName)
            .getOne<TRec>(id)
          if (!hasUpdate && !hasFinished) {
            // No update has been sent yet, send at least one
            dbg(`Sending initial update for ${collectionName}:${id}`, initial)
            cb({ action: 'initial', record: initial })
          }
        } catch (e) {
          throw new Error(`Expected ${collectionName}.${id} to exist.`)
        }
      }
      return async () => {
        dbg(`UNsubbing ${collectionName}:${id}`)
        hasFinished = true
        await unsub()
      }
    }
  )

  const watchAllById = safeCatch(
    `watchAllById`,
    logger(),
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
