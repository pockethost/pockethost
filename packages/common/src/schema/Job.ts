import { InstancesRecord } from './Instance'
import { InstanceId, RecordId, UserId } from './types'

export enum JobStatus {
  New = 'new',
  Queued = 'queued',
  Running = 'running',
  FinishedSuccess = 'finished-success',
  FinishedError = 'finished-error',
}

export type JobCommandName = string
export type JobPayloadBase = {
  cmd: JobCommandName
}

export type JobRecord<TPayload> = {
  id: RecordId
  userId: UserId
  payload: TPayload
  status: JobStatus
  message: string
}

export type JobRecord_In<TPayload> = Omit<JobRecord<TPayload>, 'id' | 'message'>

export type InstanceRecordById = { [_: InstanceId]: InstancesRecord }
