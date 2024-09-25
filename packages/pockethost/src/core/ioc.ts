import { LogEntry } from 'winston'
import { InstanceFields, InstanceId, Logger, UserFields } from '../common'
import { IoCManager } from '../common/ioc'
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

export const ioc = new IoCManager<{
  settings: Settings
  mothership: MothershipProvider
  instanceLogger: InstanceLogProvider
  logger: Logger
}>()

export const settings = () => ioc.service('settings')
export const mothership = () => ioc.service('mothership')
export const instanceLogger = () => ioc.service('instanceLogger')
export const logger = () => ioc.service('logger')
