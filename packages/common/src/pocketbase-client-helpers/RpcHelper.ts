import Ajv, { JSONSchemaType } from 'ajv'
import type pocketbaseEs from 'pocketbase'
import {
  ClientResponseError,
  RecordSubscription,
  UnsubscribeFunc,
} from 'pocketbase'
import type { JsonObject } from 'type-fest'
import { logger } from '../Logger'
import { newId } from '../newId'
import { safeCatch } from '../safeCatch'
import {
  RpcCommands,
  RpcFields,
  RpcRecord_Create,
  RpcStatus,
  RPC_COLLECTION,
} from '../schema'
import type { WatchHelper } from './WatchHelper'

export type RpcHelperConfig = {
  client: pocketbaseEs
  watchHelper: WatchHelper
}

export type RpcHelper = ReturnType<typeof createRpcHelper>

export const createRpcHelper = (config: RpcHelperConfig) => {
  const {
    client,
    watchHelper: { watchById },
  } = config

  const mkRpc = <TPayload extends JsonObject, TResult extends JsonObject>(
    cmd: RpcCommands,
    schema: JSONSchemaType<TPayload>
  ) => {
    type ConcreteRpcRecord = RpcFields<TPayload, TResult>
    const validator = new Ajv().compile(schema)
    return safeCatch(
      cmd,
      logger(),
      async (
        payload: TPayload,
        cb?: (data: RecordSubscription<ConcreteRpcRecord>) => void
      ) => {
        const { dbg, error } = logger().create(cmd)

        const _user = client.authStore.model
        if (!_user) {
          throw new Error(`Expected authenticated user here.`)
        }
        if (!validator(payload)) {
          throw new Error(`Invalid RPC payload: ${validator.errors}`)
        }
        const { id: userId } = _user
        const rpcIn: RpcRecord_Create<ConcreteRpcRecord> = {
          id: newId(),
          cmd,
          userId,
          payload,
        }
        dbg({ rpcIn })
        let unsub: UnsubscribeFunc | undefined
        return (async () => {
          dbg(`Watching ${rpcIn.id}`)
          unsub = await watchById<ConcreteRpcRecord>(
            RPC_COLLECTION,
            rpcIn.id,
            (data) => {
              dbg(`Got an RPC change`, data)
              cb?.(data)
              if (data.record.status === RpcStatus.FinishedSuccess) {
                return data.record.result
              }
              if (data.record.status === RpcStatus.FinishedError) {
                throw new ClientResponseError(data.record.result)
              }
            },
            { initialFetch: false, pollIntervalMs: 100 }
          )
          dbg(`Creating ${rpcIn.id}`)
          const newRpc = await client.collection(RPC_COLLECTION).create(rpcIn)
          dbg(`Created ${newRpc.id}`)
        })()
          .catch(error)
          .finally(async () => {
            dbg(`Unwatching ${rpcIn.id}`)
            await unsub?.()
          })
      }
    )
  }

  return { mkRpc }
}
