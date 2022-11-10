import { InstanceId, IsoDate, RecordId } from './types'

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
  created: IsoDate
  updated: IsoDate
  platform: string
  version: string
}

export type BackupRecord_Create = Pick<
  BackupRecord,
  'instanceId' | 'status' | 'platform' | 'version'
>

export type BackupRecord_Update = Partial<
  Pick<
    BackupRecord,
    'instanceId' | 'status' | 'bytes' | 'message' | 'platform' | 'version'
  >
>