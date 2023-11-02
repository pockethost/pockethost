import { BaseFields, InstanceId, RecordId } from './types'

export enum BackupStatus {
  Queued = 'queued',
  Running = 'running',
  FinishedSuccess = 'finished-success',
  FinishedError = 'finished-error',
}

export type BackupRecordId = RecordId

export type BackupFields = BaseFields & {
  instanceId: InstanceId
  status: BackupStatus
  message: string
  bytes: number
  version: string
  progress: {
    [_: string]: number
  }
}

export type BackupFields_Create = Pick<
  BackupFields,
  'instanceId' | 'status' | 'version'
>

export type BackupFields_Update = Partial<
  Pick<
    BackupFields,
    'instanceId' | 'status' | 'bytes' | 'message' | 'version' | 'progress'
  >
>
