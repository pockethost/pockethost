import { BaseFields, IsoDate, RecordId } from './types'

export const INVOCATION_COLLECTION = 'invocations'

export type InvocationPid = string
export type InvocationFields = BaseFields & {
  instanceId: RecordId
  startedAt: IsoDate
  endedAt: IsoDate
  pid: InvocationPid
  totalSeconds: number
}
