import { createPrivateKey, createPublicKey, randomBytes } from 'crypto'
import { pkcs8Ed25519ToOpenSshPrivateKeyPem } from '../../vendor/ftp-deploy/sshPrivateKey'
import { spkiToOpenSshPublicKey } from './deployKey'

/**
 * Instance-scoped API keys for CI.
 *
 * An API key is a single-line token wrapping the account email (the SFTP
 * username) and an Ed25519 seed. Its public half is registered under
 * Account → Keys restricted to specific instances, so the SFTP server rejects
 * any instance outside that scope. No PocketHost password is involved.
 */

export const API_KEY_PREFIX = 'phio_sk_'

// PKCS#8 DER header for a raw 32-byte Ed25519 seed (RFC 8410)
const ED25519_PKCS8_PREFIX = Buffer.from(
  '302e020100300506032b657004220420',
  'hex'
)
const ED25519_SEED_LEN = 32

export type ApiKey = {
  email: string
  privateKey: string
  publicKey: string
}

const keysFromSeed = (seed: Buffer) => {
  const privateKey = createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]),
    format: 'der',
    type: 'pkcs8',
  })
  const pem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
  return {
    privateKey: pkcs8Ed25519ToOpenSshPrivateKeyPem(pem),
    publicKey: spkiToOpenSshPublicKey(createPublicKey(privateKey)),
  }
}

export const generateApiKey = (email: string) => {
  const seed = randomBytes(ED25519_SEED_LEN)
  const payload = JSON.stringify({ e: email, k: seed.toString('base64url') })
  const token = `${API_KEY_PREFIX}${Buffer.from(payload).toString('base64url')}`
  return { token, ...parseApiKey(token) }
}

export const parseApiKey = (token: string): ApiKey => {
  const trimmed = token.trim()
  if (!trimmed.startsWith(API_KEY_PREFIX)) {
    throw new Error(
      `Invalid API key: expected it to start with ${API_KEY_PREFIX}`
    )
  }

  let email: unknown
  let seed: Buffer
  try {
    const payload = JSON.parse(
      Buffer.from(trimmed.slice(API_KEY_PREFIX.length), 'base64url').toString()
    )
    email = payload.e
    seed = Buffer.from(payload.k, 'base64url')
  } catch {
    throw new Error(`Invalid API key: could not decode`)
  }
  if (typeof email !== 'string' || !email || seed.length !== ED25519_SEED_LEN) {
    throw new Error(`Invalid API key: malformed payload`)
  }

  return { email, ...keysFromSeed(seed) }
}
