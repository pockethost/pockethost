import { InstanceStatus, type InstanceFields } from 'pockethost/common'

export const isInstanceShuttingDown = (instance: Pick<InstanceFields, 'power' | 'status'>) =>
  !instance.power && instance.status !== InstanceStatus.Idle && instance.status !== InstanceStatus.Unknown

export const isInstanceFullyOff = (instance: Pick<InstanceFields, 'power' | 'status'>) =>
  !instance.power && instance.status === InstanceStatus.Idle

export type InstanceRuntimeState = 'running' | 'sleeping' | 'starting' | 'vacuuming' | 'failed' | 'off'

export const getInstanceRuntimeState = (instance: Pick<InstanceFields, 'power' | 'status'>): InstanceRuntimeState => {
  if (!instance.power) return 'off'

  switch (instance.status) {
    case InstanceStatus.Running:
      return 'running'
    case InstanceStatus.Starting:
    case InstanceStatus.Port:
      return 'starting'
    case InstanceStatus.Vacuuming:
      return 'vacuuming'
    case InstanceStatus.Failed:
      return 'failed'
    default:
      return 'sleeping'
  }
}

export const runtimeStateLabel: Record<InstanceRuntimeState, string> = {
  running: 'Running',
  sleeping: 'Sleeping',
  starting: 'Starting',
  vacuuming: 'Maintaining',
  failed: 'Failed',
  off: 'Off',
}
