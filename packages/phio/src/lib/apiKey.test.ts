import { describe, expect, it } from 'vitest'
import { API_KEY_PREFIX, generateApiKey, parseApiKey } from './apiKey'
import {
  fingerprintForPublicKey,
  parseSshEd25519PublicKey,
} from './sshPublicKey'

const encode = (payload: unknown) =>
  `${API_KEY_PREFIX}${Buffer.from(JSON.stringify(payload)).toString('base64url')}`

describe('apiKey', () => {
  it('round-trips email and public key through the token', () => {
    const generated = generateApiKey('ci@example.com')
    expect(generated.token.startsWith(API_KEY_PREFIX)).toBe(true)
    expect(generated.token).not.toMatch(/\s/)

    const parsed = parseApiKey(generated.token)
    expect(parsed.email).toBe('ci@example.com')
    expect(parsed.publicKey).toBe(generated.publicKey)
  })

  it('produces keys the Account → Keys validator accepts', () => {
    const { publicKey, privateKey } = generateApiKey('ci@example.com')
    const parsed = parseSshEd25519PublicKey(publicKey)
    expect(parsed.normalized.startsWith('ssh-ed25519 ')).toBe(true)
    expect(fingerprintForPublicKey(parsed.normalized)).toMatch(/^SHA256:/)
    expect(privateKey).toContain('-----BEGIN OPENSSH PRIVATE KEY-----')
  })

  it('generates a distinct key each time', () => {
    const a = generateApiKey('ci@example.com')
    const b = generateApiKey('ci@example.com')
    expect(a.publicKey).not.toBe(b.publicKey)
  })

  it('tolerates surrounding whitespace from secret stores', () => {
    const { token } = generateApiKey('ci@example.com')
    expect(parseApiKey(`  ${token}\n`).email).toBe('ci@example.com')
  })

  it('rejects malformed tokens', () => {
    expect(() => parseApiKey('not-a-key')).toThrow(/start with/)
    expect(() => parseApiKey(`${API_KEY_PREFIX}%%%`)).toThrow(/decode/)
    expect(() =>
      parseApiKey(encode({ e: 'ci@example.com', k: 'c2hvcnQ' }))
    ).toThrow(/malformed/)
    expect(() =>
      parseApiKey(encode({ k: Buffer.alloc(32).toString('base64url') }))
    ).toThrow(/malformed/)
  })
})
