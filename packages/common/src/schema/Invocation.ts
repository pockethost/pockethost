import { BaseFields, IsoDate, RecordId } from './types'

export type InvocationFields = BaseFields & {
  instanceId: RecordId
  startedAt: IsoDate
  endedAt: IsoDate
  pid: number
  totalSeconds: number
}
