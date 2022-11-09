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
export type Seconds = number

export const pocketNow = () => new Date().toISOString()

export enum InstanceStatus {
  Unknown = '',
  Idle = 'idle',
  Port = 'porting',
  Starting = 'starting',
  Running = 'running',
  Failed = 'failed',
}

export enum InstanceBackupStatus {
  Idle = 'idle',
  Queued = 'queued',
  Running = 'running',
  Completed = 'completed',
}

export type InstancesRecord = {
  id: RecordId
  subdomain: Subdomain
  uid: UserId
  status: InstanceStatus
  backupStatus: InstanceBackupStatus
  platform: PlatformId
  version: VersionId
  secondsThisMonth: Seconds
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

export enum JobStatus {
  New = 'new',
  Queued = 'queued',
  Running = 'running',
  FinishedSuccess = 'finished-success',
  FinishedError = 'finished-error',
}

export type JobPayloadBase = {
  cmd: JobCommands
}

export enum JobCommands {
  BackupInstance = 'backup-instance',
}

export const JOB_COMMANDS = [JobCommands.BackupInstance]

export type InstanceBackupJobPayload = {
  cmd: JobCommands.BackupInstance
  instanceId: InstanceId
}

export type JobRecord<TPayload> = {
  id: RecordId
  userId: UserId
  payload: TPayload
  status: JobStatus
  message: string
}

export type InstanceBackupJobRecord = JobRecord<InstanceBackupJobPayload>

export type JobRecord_In<TPayload> = Omit<JobRecord<TPayload>, 'id' | 'message'>

export type InstanceRecordById = { [_: InstanceId]: InstancesRecord }
