import Ajv, { JSONSchemaType } from 'ajv'
import type pocketbaseEs from 'pocketbase'
import { ClientResponseError, RecordSubscription } from 'pocketbase'
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
  const _logger = logger().create(`RpcHelper`)
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
        const _rpcLogger = _logger.create(cmd)
        const { dbg, error } = _rpcLogger

        dbg(`Executing RPC`)
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
        _rpcLogger.breadcrumb(rpcIn.id)
        dbg({ rpcIn })

        return new Promise<TResult>((resolve, reject) => {
          ;(async () => {
            dbg(`Watching ${rpcIn.id}`)
            await watchById<ConcreteRpcRecord>(
              RPC_COLLECTION,
              rpcIn.id,
              (data, unsub) => {
                dbg(`Got an RPC change`, data)
                cb?.(data)
                if (data.record.status === RpcStatus.FinishedSuccess) {
                  dbg(`RPC finished successfully`, data)
                  unsub()
                  resolve(data.record.result)
                }
                if (data.record.status === RpcStatus.FinishedError) {
                  dbg(`RPC finished unsuccessfully`, data)
                  unsub()
                  reject(new ClientResponseError(data.record.result))
                }
              },
              { initialFetch: false, pollIntervalMs: 100 }
            )
            dbg(`Creating ${rpcIn.id}`)
            const newRpc = await client.collection(RPC_COLLECTION).create(rpcIn)
            dbg(`Created ${newRpc.id}`)
          })().catch((e) => {
            error(e)
            reject(e)
          })
        })
      }
    )
  }

  return { mkRpc }
}
