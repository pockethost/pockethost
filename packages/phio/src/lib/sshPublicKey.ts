import { createHash } from 'crypto'

/** ssh-ed25519 public key parsing (mirrors pockethost/common). */

const ED25519_ALGO = 'ssh-ed25519'
const ED25519_WIRE_KEY_LEN = 32
const ED25519_WIRE_LEN = 4 + ED25519_ALGO.length + 4 + ED25519_WIRE_KEY_LEN

export type ParsedSshEd25519PublicKey = {
  normalized: string
  wire: Uint8Array
}

const readUint32BE = (bytes: Uint8Array, offset: number) => {
  if (offset + 4 > bytes.length) {
    throw new Error('Invalid public key encoding.')
  }
  return (
    ((bytes[offset]! << 24) | (bytes[offset + 1]! << 16) | (bytes[offset + 2]! << 8) | bytes[offset + 3]!) >>> 0
  )
}

const readSshString = (bytes: Uint8Array, offset: number) => {
  const length = readUint32BE(bytes, offset)
  offset += 4
  if (length < 0 || offset + length > bytes.length) {
    throw new Error('Invalid public key encoding.')
  }
  const value = bytes.slice(offset, offset + length)
  return { value, nextOffset: offset + length }
}

const bytesToAscii = (bytes: Uint8Array) => {
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]!)
  }
  return out
}

const decodeBase64 = (value: string) => {
  const normalized = value.replace(/[\s\r\n]+/g, '')
  if (!normalized || normalized.length % 4 === 1 || !/^[A-Za-z0-9+/]+=*$/.test(normalized)) {
    throw new Error('Public key base64 is invalid.')
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const bytes: number[] = []
  let buffer = 0
  let bits = 0

  for (const char of normalized.replace(/=+$/, '')) {
    const index = alphabet.indexOf(char)
    if (index === -1) {
      throw new Error('Public key base64 is invalid.')
    }
    buffer = (buffer << 6) | index
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }

  return new Uint8Array(bytes)
}

const validateWire = (wire: Uint8Array) => {
  if (wire.length !== ED25519_WIRE_LEN) {
    throw new Error('Invalid Ed25519 public key length.')
  }

  let offset = 0
  const algo = readSshString(wire, offset)
  offset = algo.nextOffset
  if (bytesToAscii(algo.value) !== ED25519_ALGO) {
    throw new Error('Public key algorithm must be ssh-ed25519.')
  }

  const key = readSshString(wire, offset)
  if (key.value.length !== ED25519_WIRE_KEY_LEN) {
    throw new Error('Invalid Ed25519 public key length.')
  }
  if (key.nextOffset !== wire.length) {
    throw new Error('Invalid public key encoding.')
  }
}

export const parseSshEd25519PublicKey = (input: string): ParsedSshEd25519PublicKey => {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('Public key is required.')
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length > 1) {
    throw new Error('Paste a single public key line only.')
  }

  const line = lines[0] ?? ''
  const parts = line.split(/\s+/).filter(Boolean)
  if (parts.length < 2) {
    throw new Error('Public key must look like: ssh-ed25519 AAAA… comment')
  }

  const algo = parts[0]
  const keyData = parts[1]
  if (algo !== ED25519_ALGO) {
    throw new Error('Only ssh-ed25519 public keys are supported.')
  }

  const wire = decodeBase64(keyData!)
  validateWire(wire)

  const comment = parts.slice(2).join(' ')
  const normalized = comment ? `${ED25519_ALGO} ${keyData} ${comment}` : `${ED25519_ALGO} ${keyData}`

  return { normalized, wire }
}

export const fingerprintForPublicKey = (publicKeyLine: string): string => {
  const { wire } = parseSshEd25519PublicKey(publicKeyLine)
  const hash = createHash('sha256').update(wire).digest('base64').replace(/=+$/, '')
  return `SHA256:${hash}`
}
