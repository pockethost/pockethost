import { sha256 } from '@noble/hashes/sha2.js'
import { parseSshEd25519PublicKey } from 'pockethost/common'

function base64Encode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

export function fingerprintFromWire(wire: Uint8Array): string {
  const hash = sha256(wire)
  const encoded = base64Encode(hash).replace(/=+$/, '')
  return `SHA256:${encoded}`
}

export async function fingerprintForPublicKeyInput(publicKeyLine: string): Promise<string> {
  const { wire } = parseSshEd25519PublicKey(publicKeyLine)
  return fingerprintFromWire(wire)
}

export { parseSshEd25519PublicKey }
