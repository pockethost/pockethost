import { chmodSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { generateKeyPairSync, type KeyObject } from 'crypto'
import type PocketBase from 'pocketbase'
import { PHIO_HOME } from './constants'
import { fingerprintForPublicKey, parseSshEd25519PublicKey } from './sshPublicKey'
import { isPkcs8PrivateKey, pkcs8Ed25519ToOpenSshPrivateKeyPem } from '../../vendor/ftp-deploy/sshPrivateKey'

const SSH_KEYS_COLLECTION = 'ssh_keys'
export const DEPLOY_KEY_LABEL = 'Phio'

const PRIVATE_KEY_FILE = 'phio_deploy_ed25519'
const PUBLIC_KEY_FILE = 'phio_deploy_ed25519.pub'

export type DeployKeyPaths = {
  privateKeyPath: string
  publicKeyPath: string
}

export const getDeployKeyPaths = (): DeployKeyPaths => ({
  privateKeyPath: PHIO_HOME(PRIVATE_KEY_FILE),
  publicKeyPath: PHIO_HOME(PUBLIC_KEY_FILE),
})

const writeSshString = (value: Buffer | string) => {
  const buf = typeof value === 'string' ? Buffer.from(value) : value
  const len = Buffer.alloc(4)
  len.writeUInt32BE(buf.length)
  return Buffer.concat([len, buf])
}

const spkiToOpenSshPublicKey = (publicKey: KeyObject, comment = 'phio') => {
  const der = publicKey.export({ format: 'der', type: 'spki' })
  const raw = der.subarray(der.length - 32)
  const wire = Buffer.concat([writeSshString('ssh-ed25519'), writeSshString(raw)])
  return `ssh-ed25519 ${wire.toString('base64')} ${comment}`
}

const writeOpenSshPrivateKey = (privateKeyPath: string, privateKey: KeyObject) => {
  const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
  writeFileSync(privateKeyPath, pkcs8Ed25519ToOpenSshPrivateKeyPem(privateKeyPem), { mode: 0o600 })
}

const migratePkcs8PrivateKeyIfNeeded = (privateKeyPath: string) => {
  const pem = readFileSync(privateKeyPath, 'utf8')
  if (!isPkcs8PrivateKey(pem)) {
    return
  }
  writeFileSync(privateKeyPath, pkcs8Ed25519ToOpenSshPrivateKeyPem(pem), { mode: 0o600 })
  try {
    chmodSync(privateKeyPath, 0o600)
  } catch {
    // Windows may ignore mode bits
  }
}

const ensureLocalKeyPair = () => {
  const { privateKeyPath, publicKeyPath } = getDeployKeyPaths()

  if (existsSync(privateKeyPath) && existsSync(publicKeyPath)) {
    migratePkcs8PrivateKeyIfNeeded(privateKeyPath)
    return {
      privateKeyPath,
      publicKeyPath,
      publicKey: readFileSync(publicKeyPath, 'utf8').trim(),
    }
  }

  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const publicKeyLine = spkiToOpenSshPublicKey(publicKey)
  writeOpenSshPrivateKey(privateKeyPath, privateKey)
  writeFileSync(publicKeyPath, `${publicKeyLine}\n`, { mode: 0o644 })
  try {
    chmodSync(privateKeyPath, 0o600)
  } catch {
    // Windows may ignore mode bits
  }

  return {
    privateKeyPath,
    publicKeyPath,
    publicKey: publicKeyLine,
  }
}

const publicKeysMatch = (localPublicKey: string, remotePublicKey: string) => {
  const local = parseSshEd25519PublicKey(localPublicKey)
  const remote = parseSshEd25519PublicKey(remotePublicKey)
  return local.normalized === remote.normalized
}

export type DeployKeyRemoteStatus = 'not_checked' | 'missing' | 'registered' | 'mismatch'

export type DeployKeyStatus = {
  local: 'missing' | 'present'
  privateKeyPath: string
  publicKeyPath: string
  fingerprint?: string
  remote: DeployKeyRemoteStatus
}

const readLocalDeployKey = () => {
  const { privateKeyPath, publicKeyPath } = getDeployKeyPaths()
  if (!existsSync(privateKeyPath) || !existsSync(publicKeyPath)) {
    return { local: 'missing' as const, privateKeyPath, publicKeyPath }
  }

  const publicKey = readFileSync(publicKeyPath, 'utf8').trim()
  const parsed = parseSshEd25519PublicKey(publicKey)
  return {
    local: 'present' as const,
    privateKeyPath,
    publicKeyPath,
    publicKey: parsed.normalized,
    fingerprint: fingerprintForPublicKey(parsed.normalized),
  }
}

/** Read-only deploy key status. Does not generate keys or register remotely. */
export const getDeployKeyStatus = async (client?: PocketBase): Promise<DeployKeyStatus> => {
  const localKey = readLocalDeployKey()
  if (localKey.local === 'missing') {
    return {
      local: 'missing',
      privateKeyPath: localKey.privateKeyPath,
      publicKeyPath: localKey.publicKeyPath,
      remote: client?.authStore.isValid ? 'missing' : 'not_checked',
    }
  }

  let remote: DeployKeyRemoteStatus = client?.authStore.isValid ? 'missing' : 'not_checked'
  if (client?.authStore.isValid) {
    const userId = client.authStore.record?.id
    if (userId) {
      try {
        const remoteKey = await client.collection(SSH_KEYS_COLLECTION).getFirstListItem(
          `user=${JSON.stringify(userId)} && label=${JSON.stringify(DEPLOY_KEY_LABEL)}`
        )
        remote = publicKeysMatch(localKey.publicKey, remoteKey.public_key) ? 'registered' : 'mismatch'
      } catch {
        remote = 'missing'
      }
    }
  }

  return {
    local: 'present',
    privateKeyPath: localKey.privateKeyPath,
    publicKeyPath: localKey.publicKeyPath,
    fingerprint: localKey.fingerprint,
    remote,
  }
}

export const formatDeployKeyRemoteStatus = (remote: DeployKeyRemoteStatus) => {
  switch (remote) {
    case 'registered':
      return 'registered (matches local)'
    case 'missing':
      return 'not registered (created on deploy)'
    case 'mismatch':
      return 'mismatch with local key'
    case 'not_checked':
      return 'not checked'
  }
}

/**
 * Ensures a local Ed25519 deploy key exists under PHIO_HOME and that Account → Keys
 * has a matching "Phio" entry. Creates the remote key on first run.
 */
export const ensureDeployKey = async (client: PocketBase) => {
  const userId = client.authStore.record?.id
  if (!userId) {
    throw new Error(`You must be logged in first. Use 'phio login'`)
  }

  const { privateKeyPath, publicKeyPath, publicKey } = ensureLocalKeyPair()
  const parsed = parseSshEd25519PublicKey(publicKey)
  const fingerprint = fingerprintForPublicKey(parsed.normalized)

  let remoteKey: { id: string; public_key: string } | undefined
  try {
    remoteKey = await client.collection(SSH_KEYS_COLLECTION).getFirstListItem(
      `user=${JSON.stringify(userId)} && label=${JSON.stringify(DEPLOY_KEY_LABEL)}`
    )
  } catch {
    remoteKey = undefined
  }

  if (remoteKey) {
    if (!publicKeysMatch(parsed.normalized, remoteKey.public_key)) {
      throw new Error(
        `Account key "${DEPLOY_KEY_LABEL}" does not match the local key in ${PHIO_HOME()}. ` +
          `Update it at https://pockethost.io/account/keys or delete ${PUBLIC_KEY_FILE} to regenerate locally.`
      )
    }
    return { privateKeyPath, publicKeyPath, publicKey: parsed.normalized, fingerprint }
  }

  try {
    await client.collection(SSH_KEYS_COLLECTION).create({
      label: DEPLOY_KEY_LABEL,
      public_key: parsed.normalized,
      fingerprint,
      all_instances: true,
      instances: [],
      user: userId,
    })
    console.log(`Registered SFTP deploy key "${DEPLOY_KEY_LABEL}" under Account → Keys`)
  } catch (error) {
    const message = `${error}`
    if (message.includes('fingerprint') || message.includes('unique')) {
      throw new Error(
        `This deploy key is already registered under a different label. ` +
          `Add or rename a key labeled "${DEPLOY_KEY_LABEL}" at https://pockethost.io/account/keys.`
      )
    }
    throw error
  }

  return { privateKeyPath, publicKeyPath, publicKey: parsed.normalized, fingerprint }
}
