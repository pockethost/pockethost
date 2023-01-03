import { BaseFields } from './types'

export enum StreamNames {
  Info = 'info',
  Warning = 'warning',
  Debug = 'debug',
  Error = 'error',
  System = 'system',
}

export type InstanceLogFields = BaseFields & {
  message: string
  stream: StreamNames
}

export type InstanceLogFields_Create = InstanceLogFields
