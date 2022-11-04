import { PlatformId, VersionId } from './releases'

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
export type CollectionName = string

export const pocketNow = () => new Date().toISOString()

export enum InstanceStatus {
  Unknown = '',
  Idle = 'idle',
  Port = 'porting',
  Starting = 'starting',
  Running = 'running',
  Failed = 'failed',
}

export type InstancesRecord = {
  id: RecordId
  subdomain: Subdomain
  uid: UserId
  status: InstanceStatus
  platform: PlatformId
  version: VersionId
}

export type InstancesRecord_New = Omit<InstancesRecord, 'id'>

export type UserRecord = {
  id: RecordId
  email: string
  verified: boolean
}

export type InvocationRecord = {
  id: RecordId
  instanceId: RecordId
  startedAt: IsoDate
  endedAt: IsoDate
  pid: number
  totalSeconds: number
}

export type InstanceRecordById = { [_: InstanceId]: InstancesRecord }
