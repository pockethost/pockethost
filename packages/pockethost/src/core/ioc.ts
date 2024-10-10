import { LogEntry } from 'winston'
import { InstanceFields, InstanceId, ioc, UserFields } from '../common'
import { Settings } from '../constants'

export type MothershipProvider = {
  getAllInstances(): Promise<InstanceFields[]>
  getInstanceById(id: InstanceId): Promise<[InstanceFields, UserFields] | []>
  getInstanceBySubdomain(
    subdomain: InstanceFields['subdomain'],
  ): Promise<[InstanceFields, UserFields] | []>
  updateInstance(id: InstanceId, fields: Partial<InstanceFields>): Promise<void>
}
type UnsubFunc = () => void

export type InstanceLogProvider = (
  instanceId: InstanceId,
  target: string,
) => {
  info(msg: string): void
  error(msg: string): void
  tail(linesBack: number, data: (line: LogEntry) => void): UnsubFunc
}

export const settings = () => ioc('settings') as Settings
export const mothership = () => ioc('mothership') as MothershipProvider
export const instanceLogger = () => ioc('instanceLogger') as InstanceLogProvider
