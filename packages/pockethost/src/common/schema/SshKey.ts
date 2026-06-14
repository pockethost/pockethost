import type { BaseFields, RecordId, UserId } from '.'

export const SSH_KEY_COLLECTION = 'ssh_keys'

export type SshKeyFields = BaseFields & {
  user: UserId
  label: string
  public_key: string
  fingerprint: string
  all_instances: boolean
  instances: RecordId[]
}

export type SshKeyFields_WithInstances = SshKeyFields & {
  expand?: {
    instances?: { id: RecordId; subdomain: string }[]
  }
}
