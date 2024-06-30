import { doNewInstanceRecordFilter } from '../plugin'
import { IsoDate } from './BaseFields'
import { newId, pocketNow } from './util'

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

export type InstanceId = string
export type InstanceSecretKey = string
export type InstanceSecretValue = string
export type InstanceSecretCollection = {
  [name: InstanceSecretKey]: InstanceSecretValue
}

export type InstanceFields = {
  id: string
  subdomain: string
  version: VersionId
  secrets: InstanceSecretCollection
  dev: boolean // Should instance run in --dev mode
  created: IsoDate
  updated: IsoDate
}

export const mkInstance = (subdomain: string, id = newId()) => {
  const now = pocketNow()
  return doNewInstanceRecordFilter({
    id,
    subdomain,
    version: '*',
    secrets: {},
    dev: false,
    created: now,
    updated: now,
  })
}
