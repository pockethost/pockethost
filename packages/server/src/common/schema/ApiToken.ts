import type { BaseFields, RecordId, UserId } from '.'

export const API_TOKEN_COLLECTION = 'api_tokens'

export type ApiTokenScope = 'read' | 'write'

/** Fields a token owner can read. `secret_hash` is hidden and never leaves the server. */
export type ApiTokenFields = BaseFields & {
  user: UserId
  label: string
  hint: string
  scopes: ApiTokenScope[]
  all_instances: boolean
  instances: RecordId[]
  expires: string
  last_used: string
  last_used_ip: string
}
