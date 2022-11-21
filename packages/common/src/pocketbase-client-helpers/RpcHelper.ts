import { customAlphabet } from 'nanoid'
import type pocketbaseEs from 'pocketbase'
import {
  ClientResponseError,
  RecordSubscription,
  UnsubscribeFunc,
} from 'pocketbase'
import type { JsonObject } from 'type-fest'
import { Logger } from '../Logger'
import { PromiseHelper } from '../PromiseHelper'
import { BaseFields, RpcCommands, UserId } from '../schema'
import type { WatchHelper } from './WatchHelper'

export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz')
export const newId = () => nanoid(15)

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

export type RpcRecord_Create<TRecord extends RpcFields<any, any>> = Pick<
  TRecord,
  'id' | 'userId' | 'payload' | 'cmd'
>

export type RpcFields<
  TPayload extends RpcPayloadBase,
  TRes extends JsonObject
> = BaseFields & {
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
    logger: { dbg },
  } = config

  const mkRpc = <TPayload extends JsonObject, TResult extends JsonObject>(
    cmd: RpcCommands
  ) => {
    type ConcreteRpcRecord = RpcFields<TPayload, TResult>

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
        const rpcIn: RpcRecord_Create<ConcreteRpcRecord> = {
          id: newId(),
          cmd,
          userId,
          payload,
        }
        dbg({ rpcIn })
        let unsub: UnsubscribeFunc | undefined
        return new Promise<ConcreteRpcRecord['result']>(
          async (resolve, reject) => {
            unsub = await watchById<ConcreteRpcRecord>(
              RPC_COLLECTION,
              rpcIn.id,
              (data) => {
                dbg(`Got an RPC change`, data)
                cb?.(data)
                if (data.record.status === RpcStatus.FinishedSuccess) {
                  resolve(data.record.result)
                  return
                }
                if (data.record.status === RpcStatus.FinishedError) {
                  reject(new ClientResponseError(data.record.result))
                  return
                }
              },
              false
            )
            await client.collection(RPC_COLLECTION).create(rpcIn)
          }
        ).finally(async () => {
          await unsub?.()
        })
      }
    )
  }

  return { mkRpc }
}
