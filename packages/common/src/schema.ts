export type RecordId = string
export type UserId = RecordId
export type InstanceId = RecordId
export type InternalInstanceId = RecordId
export type Subdomain = string
export type Port = number
export type IsoDate = string
export type ProcessId = number
export type Username = string
export type Password = string

export const pocketNow = () => new Date().toISOString()

export enum InstanceStatus {
  Unknown = '',
  Idle = 'idle',
  Port = 'porting',
  Starting = 'starting',
  Running = 'running',
  Failed = 'failed',
}

export type Instance_In = {
  uid?: UserId
  subdomain?: Subdomain
  status?: InstanceStatus
}

export type PocketbaseRecord<TIdType extends RecordId> = {
  id: TIdType
  created: IsoDate
  updated: IsoDate
}

export type Instance_Out = PocketbaseRecord<InstanceId> & {
  uid: UserId
  subdomain: Subdomain
  status: InstanceStatus
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
