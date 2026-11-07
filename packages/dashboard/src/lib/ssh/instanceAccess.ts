import type { RecordId, SshKeyFields } from '@pockethost/server/common'

export const sshKeyAccessesInstance = (key: SshKeyFields, instanceId: RecordId) =>
  key.all_instances || (key.instances ?? []).includes(instanceId)

export const sshKeysForInstance = (keys: SshKeyFields[], instanceId: RecordId) =>
  keys.filter((key) => sshKeyAccessesInstance(key, instanceId))
