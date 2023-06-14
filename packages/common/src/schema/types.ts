export type RecordId = string
export type UserId = RecordId
export type InstanceId = RecordId
export type Semver = string
export type InternalInstanceId = RecordId
export type Subdomain = string
export type Port = number
export type IsoDate = string
export type ProcessId = number
export type Username = string
export type Password = string
export type CollectionName = string
export type Seconds = number
export type BaseFields = {
  id: RecordId
  created: IsoDate
  updated: IsoDate
}
