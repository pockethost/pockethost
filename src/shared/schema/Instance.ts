import { BaseFields, RecordId, Seconds, Subdomain, UserId } from './types'

export type VersionId = string

export const INSTANCE_COLLECTION = 'instances'

export enum InstanceStatus {
  Unknown = '',
  Idle = 'idle',
  Port = 'porting',
  Starting = 'starting',
  Running = 'running',
  Failed = 'failed',
}

export type InstanceSecretKey = string
export type InstanceSecretValue = string
export type InstanceSecretCollection = {
  [name: InstanceSecretKey]: InstanceSecretValue
}

export type InstanceFields = BaseFields & {
  subdomain: Subdomain
  uid: UserId
  status: InstanceStatus
  version: VersionId
  secondsThisMonth: Seconds
  secrets: InstanceSecretCollection | null
  maintenance: boolean
}

export type InstanceFields_Create = Omit<InstanceFields, keyof BaseFields>

export type InstanceRecordsById = { [_: RecordId]: InstanceFields }
