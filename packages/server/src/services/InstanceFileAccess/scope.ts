import type { UserId } from '@'

export type VfsScope = {
  userId: UserId
  /** Null = all instances owned by the user */
  instanceIds: string[] | null
}

export function instanceAllowedByScope(scope: VfsScope | undefined, instanceId: string, userId: string): boolean {
  if (!scope) {
    return true
  }

  if (scope.userId !== userId) {
    return false
  }

  if (scope.instanceIds === null) {
    return true
  }

  return scope.instanceIds.includes(instanceId)
}
