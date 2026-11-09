import { InstanceFields, InstanceStatus } from '@'

/** Skip live status writes when the user has powered off (idle is always allowed). */
export const shouldSkipInstanceFieldUpdate = (fields: Partial<InstanceFields>, power: boolean | undefined): boolean => {
  const { status } = fields
  if (status === undefined || status === InstanceStatus.Idle) return false
  return !power
}
