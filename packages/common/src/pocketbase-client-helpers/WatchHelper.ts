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

  const watchById = async <TRec>(
    collectionName: string,
    id: RecordId,
    cb: (data: RecordSubscription<TRec>, unsub: UnsubscribeFunc) => void,
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
    let hasUpdate = false
    let hasFinished = false
    if (pollIntervalMs) {
      dbg(`Configuring polling for ${pollIntervalMs}ms`)
      tm.repeat(async () => {
        dbg(`Checking ${id} by polling`)
        try {
          const rec = await client.collection(collectionName).getOne<TRec>(id)
          hasUpdate = true
          dbg(`Got an update polling ${collectionName}:${id}`)
          cb({ action: 'poll', record: rec }, _unsub)
        } catch (e) {
          dbg(`Failed to poll at interval`, e)
        }
        return true
      }, pollIntervalMs)
    }

    const _unsub = async () => {
      dbg(`Unsubbing ${collectionName}:${id}`)
      tm.shutdown()
      hasFinished = true
      await unsub()
    }

    const unsub = await client
      .collection(collectionName)
      .subscribe<TRec>(id, (e) => {
        dbg(`Got an update watching ${collectionName}:${id}`, e)
        cb(e, _unsub)
      })

    if (initialFetch) {
      try {
        const initial = await client.collection(collectionName).getOne<TRec>(id)
        if (!hasUpdate && !hasFinished) {
          // No update has been sent yet, send at least one
          dbg(`Sending initial update for ${collectionName}:${id}`, initial)
          cb({ action: 'initial', record: initial }, _unsub)
        }
      } catch (e) {
        throw new Error(`Expected ${collectionName}.${id} to exist.`)
      }
    }
    return _unsub
  }

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
