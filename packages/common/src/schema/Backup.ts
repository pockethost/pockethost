import { InstanceId, RecordId } from './types'

export enum BackupStatus {
  New = 'new',
  Running = 'running',
  FinishedSuccess = 'finished-success',
  FinishedError = 'finished-error',
}

export type BackupRecordId = RecordId
export type BackupRecord = {
  id: BackupRecordId
  instanceId: InstanceId
  status: BackupStatus
  message: string
  bytes: number
}

export type BackupRecord_In = Omit<BackupRecord, 'id' | 'message' | 'bytes'>
