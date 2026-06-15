import type { InstanceFields, RecordId, SshKeyFields } from 'pockethost/common'

export const sshKeyScopeLabel = (
  key: SshKeyFields,
  instancesById: Record<RecordId, InstanceFields>
): string => {
  if (key.all_instances) return 'All instances'

  const names = (key.instances ?? [])
    .map((id) => instancesById[id]?.subdomain)
    .filter((name): name is string => !!name)

  if (names.length === 0) {
    const count = key.instances?.length ?? 0
    return count === 1 ? '1 instance' : `${count} instances`
  }

  return names.join(', ')
}
