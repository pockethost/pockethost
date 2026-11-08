import { ensureLocalDeployKey, SSH_KEYS_URL } from './deployKey'
import { resolveDeployCredential, tokenWhoami } from './token'

export class SshKeyNotRegisteredError extends Error {}

/**
 * SFTP signs in with your account email and the CLI's local SSH key. A token can't register SSH keys, so the key must
 * already be on your account (Account → Keys). The token is only used to look up the email and check the key.
 */
/** SFTP shuts down on this date. */
export const SFTP_SUNSET_DATE = 'February 6, 2027'

let warnedSunset = false
/** One-time notice on every SFTP code path (`pockethost sftp`, `deploy --sftp`, `dev --sftp`). */
export const warnSftpSunset = () => {
  if (warnedSunset) return
  warnedSunset = true
  console.warn(
    `⚠️  SFTP shuts down on ${SFTP_SUNSET_DATE}. Use 'pockethost deploy' / 'pockethost dev' (HTTPS) for code, and ` +
      `'pockethost files', 'pull', 'upload' and 'rm' for everything else. https://pockethost.io/blog/sftp-sunset`
  )
}

export const sftpCredentials = async () => {
  warnSftpSunset()
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
