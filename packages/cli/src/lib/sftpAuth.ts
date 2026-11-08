import { ensureLocalDeployKey, SSH_KEYS_URL } from './deployKey'
import { resolveDeployCredential, tokenWhoami } from './token'

export class SshKeyNotRegisteredError extends Error {}

/**
 * SFTP signs in with your account email and the CLI's local SSH key. A token can't register SSH keys, so the key must
 * already be on your account (Account → Keys). The token is only used to look up the email and check the key.
 */
export const sftpCredentials = async () => {
  const cred = await resolveDeployCredential()
  const key = ensureLocalDeployKey()
  const who = await tokenWhoami(cred.token, key.fingerprint)
  if (!who.sshKey) {
    throw new SshKeyNotRegisteredError(
      [
        `This computer's SSH key isn't on your PocketHost account yet.`,
        `Add it once at ${SSH_KEYS_URL} (paste the line below), then run this again:`,
        ``,
        `  ${key.publicKey}`,
        ``,
        `It's also saved at ${key.publicKeyPath}. Or skip SFTP: 'pockethost deploy' needs only your token.`,
      ].join('\n')
    )
  }
  return {
    email: who.email,
    privateKeyPath: key.privateKeyPath,
    keyLabel: who.sshKey.label,
  }
}
