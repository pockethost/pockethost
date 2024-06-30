export type RecordId = string
export type UserId = RecordId
export type IsoDate = string
export type BaseFields = {
  id: RecordId
  created: IsoDate
  updated: IsoDate
}

export type AnyField = { [_: string]: string | number }
