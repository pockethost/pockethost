import { IsoDate, RecordId } from './types'

export type InvocationRecord = {
  id: RecordId
  instanceId: RecordId
  startedAt: IsoDate
  endedAt: IsoDate
  pid: number
  totalSeconds: number
}
