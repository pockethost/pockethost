import { doNewInstanceRecordFilter } from '../plugin'

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
  subdomain: string
  version: VersionId
  secrets: InstanceSecretCollection
  dev: boolean // Should instance run in --dev mode
}

export const mkInstance = (subdomain: string) =>
  doNewInstanceRecordFilter({
    subdomain,
    version: '*',
    secrets: {},
    dev: false,
  })
