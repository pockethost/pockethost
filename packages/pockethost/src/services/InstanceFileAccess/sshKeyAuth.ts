import { createHash } from 'crypto'
import { SSH_KEY_COLLECTION, SshKeyFields, UserFields } from '@'
import ssh2 from 'ssh2'
import type { PocketBase } from '@'

export type SshKeyAuthResult = {
  user: UserFields
  key: SshKeyFields
  instanceIds: string[] | null
}

export function sshPublicKeyFingerprint(keyData: Buffer): string {
  const hash = createHash('sha256').update(keyData).digest('base64')
  return `SHA256:${hash.replace(/=+$/, '')}`
}

export async function findSshKeyByPublicKey(
  adminClient: PocketBase,
  email: string,
  keyAlgo: string,
  keyData: Buffer
): Promise<SshKeyAuthResult | null> {
  if (keyAlgo !== 'ssh-ed25519') {
    return null
  }

  let user: UserFields
  try {
    user = await adminClient.collection('users').getFirstListItem<UserFields>(`email=${JSON.stringify(email)}`)
  } catch {
    return null
  }

  const keys = await adminClient.collection(SSH_KEY_COLLECTION).getFullList<SshKeyFields>({
    filter: `user=${JSON.stringify(user.id)}`,
  })

  for (const key of keys) {
    let parsed
    try {
      parsed = ssh2.utils.parseKey(key.public_key)
    } catch {
      continue
    }

    if (parsed.type !== 'ssh-ed25519') {
      continue
    }

    if (!parsed.getPublicSSH().equals(keyData)) {
      continue
    }

    const instanceIds = key.all_instances ? null : key.instances?.length ? [...key.instances] : []

    return { user, key, instanceIds }
  }

  return null
}

export function verifySshPublicKeySignature(
  publicKeyLine: string,
  blob: Buffer,
  signature: Buffer,
  hashAlgo?: string
): boolean {
  const parsed = ssh2.utils.parseKey(publicKeyLine)
  return parsed.verify(blob, signature, hashAlgo)
}
