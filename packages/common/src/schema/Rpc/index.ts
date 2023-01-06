import Ajv from 'ajv'
import { JsonObject } from 'type-fest'
import { BaseFields, UserId } from '../types'

export const RPC_COLLECTION = 'rpc'
export enum RpcCommands {
  CreateInstance = 'create-instance',
  BackupInstance = 'backup-instance',
  // RestoreInstance = 'restore-instance',
  SaveSecrets = 'save-secrets',
  // gen:enum
}

export const RPC_COMMANDS = [
  RpcCommands.CreateInstance,
  RpcCommands.BackupInstance,
  // RpcCommands.RestoreInstance,
  RpcCommands.SaveSecrets,
]

export enum RpcStatus {
  New = 'new',
  Queued = 'queued',
  Running = 'running',
  Starting = 'starting',
  FinishedSuccess = 'finished-success',
  FinishedError = 'finished-error',
}

export type RpcPayloadBase = JsonObject

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

export type RpcRecord_Create<TRecord extends RpcFields<any, any>> = Pick<
  TRecord,
  'id' | 'userId' | 'payload' | 'cmd'
>

export const ajv = new Ajv()

export * from './BackupInstance'
export * from './CreateInstance'
export * from './RestoreInstance'
export * from './SaveSecrets'
// gen:export
