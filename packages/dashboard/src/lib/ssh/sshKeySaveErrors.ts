import { client } from '$src/pocketbase-client'
import type { RecordId, SshKeyFields } from 'pockethost/common'
import { ClientResponseError } from 'pocketbase'
import { sshKeyAccessesInstance } from './instanceAccess'

export const findDuplicateKey = (keys: SshKeyFields[], fingerprint: string) =>
  keys.find((key) => key.fingerprint === fingerprint)

export const isSshKeyUniqueViolation = (error: unknown) => {
  if (!(error instanceof ClientResponseError)) return false
  const fields = error.data?.data as Record<string, { code?: string } | undefined> | undefined
  if (!fields) return false
  return Object.values(fields).some((field) => field?.code === 'validation_not_unique')
}

export const duplicateKeyMessage = (key: SshKeyFields) =>
  `This public key is already saved as "${key.label}".`

export const formatSshKeySaveError = (error: unknown, duplicateKey?: SshKeyFields) => {
  if (duplicateKey) return duplicateKeyMessage(duplicateKey)
  if (isSshKeyUniqueViolation(error)) return 'This public key is already on your account.'
  const messages = [...new Set(client().parseError(error as Error))]
  return messages.join(' ') || `${error}`
}

export const shouldGrantInstanceAccess = (
  duplicate: SshKeyFields,
  instanceId: RecordId | undefined
): instanceId is RecordId => !!instanceId && !sshKeyAccessesInstance(duplicate, instanceId)
