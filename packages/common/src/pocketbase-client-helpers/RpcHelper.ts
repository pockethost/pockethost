import type pocketbaseEs from 'pocketbase'
import type { RecordSubscription } from 'pocketbase'
import type { JsonObject } from 'type-fest'
import { Logger } from '../Logger'
import { PromiseHelper } from '../PromiseHelper'
import { RecordId, RpcCommands, UserId } from '../schema'
import type { WatchHelper } from './WatchHelper'

export type RpcHelperConfig = {
  client: pocketbaseEs
  watchHelper: WatchHelper
  promiseHelper: PromiseHelper
  logger: Logger
}

export type RpcHelper = ReturnType<typeof createRpcHelper>

export enum RpcStatus {
  New = 'new',
  Queued = 'queued',
  Running = 'running',
  Starting = 'starting',
  FinishedSuccess = 'finished-success',
  FinishedError = 'finished-error',
}

export type RpcPayloadBase = JsonObject

export type RpcRecord_In<TRecord extends RpcRecord<any, any>> = Pick<
  TRecord,
  'userId' | 'payload' | 'cmd'
>

export type RpcRecord<
  TPayload extends RpcPayloadBase,
  TRes extends JsonObject
> = {
  id: RecordId
  userId: UserId
  cmd: string
  payload: TPayload
  status: RpcStatus
  message: string
  result: TRes
}

export const RPC_COLLECTION = `rpc`

export const createRpcHelper = (config: RpcHelperConfig) => {
  const {
    client,
    watchHelper: { watchById },
    promiseHelper: { safeCatch },
  } = config

  const mkRpc = <TPayload extends JsonObject, TResult extends JsonObject>(
    cmd: RpcCommands
  ) => {
    type ConcreteRpcRecord = RpcRecord<TPayload, TResult>

    return safeCatch(
      cmd,
      async (
        payload: TPayload,
        cb?: (data: RecordSubscription<ConcreteRpcRecord>) => void
      ) => {
        const _user = client.authStore.model
        if (!_user) {
          throw new Error(`Expected authenticated user here.`)
        }
        const { id: userId } = _user
        const rpcIn: RpcRecord_In<ConcreteRpcRecord> = {
          cmd,
          userId,
          payload,
        }
        const rec = await client
          .collection(RPC_COLLECTION)
          .create<ConcreteRpcRecord>(rpcIn)
        return new Promise<ConcreteRpcRecord['result']>(
          async (resolve, reject) => {
            const unsub = watchById<ConcreteRpcRecord>(
              RPC_COLLECTION,
              rec.id,
              (data) => {
                if (data.record.status === RpcStatus.FinishedSuccess) {
                  unsub.then((u) => {
                    u()
                    resolve(data.record.result)
                  })
                  return
                }
                if (data.record.status === RpcStatus.FinishedError) {
                  unsub.then((u) => {
                    reject(data.record.message)
                    u()
                  })
                  return
                }
                cb?.(data)
              }
            )
          }
        )
      }
    )
  }

  return { mkRpc }
}
