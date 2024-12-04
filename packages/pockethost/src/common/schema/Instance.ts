import type { BaseFields, RecordId, Subdomain, UserFields, UserId } from '.'

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

export type InstanceFields<TExtra = {}> = BaseFields & {
  region: string
  subdomain: Subdomain
  uid: UserId
  status: InstanceStatus
  version: VersionId
  secrets: InstanceSecretCollection | null
  power: boolean
  suspension: string
  syncAdmin: boolean
  cname: string
  dev: boolean
  cname_active: boolean
  volume: string
  idleTtl: number
} & TExtra

export type WithUser<TUser = UserFields> = {
  expand: { uid: TUser }
}

export type InstanceFields_WithUser = InstanceFields<WithUser>

export type InstanceFields_Create = Omit<InstanceFields, keyof BaseFields>

export type InstanceRecordsById = { [_: RecordId]: InstanceFields }
