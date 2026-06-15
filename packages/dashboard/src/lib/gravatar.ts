import { md5 } from '@noble/hashes/legacy.js'

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function gravatarUrl(email: string, size = 32): string {
  const normalized = email.trim().toLowerCase()
  const hash = bytesToHex(md5(new TextEncoder().encode(normalized)))
  return `https://www.gravatar.com/avatar/${hash}?d=mp&s=${Math.max(size * 2, 80)}`
}
