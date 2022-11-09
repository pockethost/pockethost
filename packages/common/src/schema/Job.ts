import { InstancesRecord } from './Instance'
import { InstanceId, RecordId, UserId } from './types'

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
