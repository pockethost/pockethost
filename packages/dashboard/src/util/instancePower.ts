import { InstanceStatus, type InstanceFields } from 'pockethost/common'

export const isInstanceShuttingDown = (instance: Pick<InstanceFields, 'power' | 'status'>) =>
  !instance.power && instance.status !== InstanceStatus.Idle && instance.status !== InstanceStatus.Unknown

export const isInstanceFullyOff = (instance: Pick<InstanceFields, 'power' | 'status'>) =>
  !instance.power && instance.status === InstanceStatus.Idle
