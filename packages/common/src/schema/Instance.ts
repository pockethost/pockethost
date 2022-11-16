import { PlatformId, VersionId } from '../releases'
import { RecordId, Seconds, Subdomain, UserId } from './types'

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
  secondsThisMonth: Seconds
}

export type InstancesRecord_New = Omit<
  InstancesRecord,
  'id' | 'secondsThisMonth'
>
