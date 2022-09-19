import { AnyBrand, Brand, identity } from 'ts-brand'

export type UserId = Brand<string, 'UserId'>
export type InstanceId = Brand<string, 'InstanceId'>
export type InternalInstanceId = Brand<string, 'InternalInstanceId'>
export type Subdomain = Brand<string, 'Subdomain'>
export type Port = Brand<number, 'Port'>
export type IsoDate = Brand<string, 'IsoDate'>
export type ProcessId = Brand<number, 'ProcessId'>
export type Username = Brand<string, 'username'>
export type Password = Brand<string, 'password'>

export const pocketNow = () => identity<IsoDate>(new Date().toISOString())

export enum InstanceStatuses {
  Unknown = '',
  Provisioning = 'provisioning',
  Port = 'obtaining port',
  Cert = 'creating SSL cert',
  Starting = 'starting',
  Started = 'started',
  Failed = 'failed',
}

export type Instance_In = {
  uid?: UserId
  subdomain?: Subdomain
  status?: InstanceStatuses
}

export type PocketbaseRecord<TIdType extends AnyBrand> = {
  id: TIdType
  created: IsoDate
  updated: IsoDate
}

export type Instance_Out = PocketbaseRecord<InstanceId> & {
  uid: UserId
  subdomain: Subdomain
  status: InstanceStatuses
}

export type Instance_Internal_In = {
  instanceId?: InstanceId
  port?: Port
  certCreatedAt?: IsoDate
  nginxCreatedAt?: IsoDate
  pid?: ProcessId
  launchedAt?: IsoDate
}

export type Instance_Internal_Out = PocketbaseRecord<InternalInstanceId> & {
  instanceId: InstanceId
  port: Port
  certCreatedAt: IsoDate
  nginxCreatedAt: IsoDate
  pid: ProcessId
  launchedAt: IsoDate
}

export type Any_Record_Out = Instance_Out | Instance_Internal_Out

export type Instance_Out_ByIdCollection = {
  [_: InstanceId]: Instance_Out
}

export type Instance_Internal_Out_ByIdCollection = {
  [_: InstanceId]: Instance_Internal_Out
}
