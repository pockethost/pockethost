import { chmodSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { generateKeyPairSync, type KeyObject } from 'crypto'
import { CLI_HOME, DEPLOY_KEY_FILE } from './constants'
import {
  fingerprintForPublicKey,
  parseSshEd25519PublicKey,
} from './sshPublicKey'
import {
  isPkcs8PrivateKey,
  pkcs8Ed25519ToOpenSshPrivateKeyPem,
} from '../../vendor/ftp-deploy/sshPrivateKey'

export const DEPLOY_KEY_LABEL = 'PocketHost CLI'
export const SSH_KEYS_URL = 'https://pockethost.io/account/keys'

const PRIVATE_KEY_FILE = DEPLOY_KEY_FILE
const PUBLIC_KEY_FILE = `${DEPLOY_KEY_FILE}.pub`

export type DeployKeyPaths = {
  privateKeyPath: string
  publicKeyPath: string
}

export const getDeployKeyPaths = (): DeployKeyPaths => ({
  privateKeyPath: CLI_HOME(PRIVATE_KEY_FILE),
  publicKeyPath: CLI_HOME(PUBLIC_KEY_FILE),
})

const writeSshString = (value: Buffer | string) => {
  const buf = typeof value === 'string' ? Buffer.from(value) : value
  const len = Buffer.alloc(4)
  len.writeUInt32BE(buf.length)
  return Buffer.concat([len, buf])
}

const spkiToOpenSshPublicKey = (
  publicKey: KeyObject,
  comment = 'pockethost'
) => {
  const der = publicKey.export({ format: 'der', type: 'spki' })
  const raw = der.subarray(der.length - 32)
  const wire = Buffer.concat([
    writeSshString('ssh-ed25519'),
    writeSshString(raw),
  ])
  return `ssh-ed25519 ${wire.toString('base64')} ${comment}`
}

const writeOpenSshPrivateKey = (
  privateKeyPath: string,
  privateKey: KeyObject
) => {
  const privateKeyPem = privateKey
    .export({ format: 'pem', type: 'pkcs8' })
    .toString()
  writeFileSync(
    privateKeyPath,
    pkcs8Ed25519ToOpenSshPrivateKeyPem(privateKeyPem),
    { mode: 0o600 }
  )
}

const migratePkcs8PrivateKeyIfNeeded = (privateKeyPath: string) => {
  const pem = readFileSync(privateKeyPath, 'utf8')
  if (!isPkcs8PrivateKey(pem)) {
    return
  }
  writeFileSync(privateKeyPath, pkcs8Ed25519ToOpenSshPrivateKeyPem(pem), {
    mode: 0o600,
  })
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

/**
 * The local Ed25519 key `pockethost sftp` and `--sftp` use, under the config folder. Created on first use. The CLI
 * cannot register it on your account (tokens can't add SSH keys); add the public key under Account → Keys once.
 */
export const ensureLocalDeployKey = () => {
  const { privateKeyPath, publicKeyPath, publicKey } = ensureLocalKeyPair()
  const parsed = parseSshEd25519PublicKey(publicKey)
  return {
    privateKeyPath,
    publicKeyPath,
    publicKey: parsed.normalized,
    fingerprint: fingerprintForPublicKey(parsed.normalized),
  }
}
