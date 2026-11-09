import { describe, expect, it } from 'vitest'
import { bearerToken, formatPat, looksLikePat, parsePat, patExpired, patHint } from './pat'

const id = 'abcdefghij12345'
const secret = 'A'.repeat(40) + 'xyz'

describe('pat', () => {
  it('round-trips format/parse', () => {
    const raw = formatPat(id, secret)
    expect(raw).toBe(`ph_pat_${id}_${secret}`)
    expect(parsePat(raw)).toEqual({ id, secret })
    expect(parsePat(`  ${raw}\n`)).toEqual({ id, secret })
  })

  it('rejects malformed tokens', () => {
    expect(parsePat(undefined)).toBeNull()
    expect(parsePat('ph_pat_short_x')).toBeNull()
    expect(parsePat(`ph_pat_${id}_${secret}x`)).toBeNull()
    expect(parsePat(`ph_pat_${id.toUpperCase()}_${secret}`)).toBeNull()
    expect(parsePat(`ph_pat_${id}_${secret.slice(0, -1)}-`)).toBeNull()
    expect(parsePat(`xx_pat_${id}_${secret}`)).toBeNull()
  })

  it('detects PAT-looking strings and hints', () => {
    expect(looksLikePat('ph_pat_x')).toBe(true)
    expect(looksLikePat('eyJhbGciOi')).toBe(false)
    expect(patHint(secret)).toBe('Axyz'.slice(-4))
  })

  it('reads bearer tokens', () => {
    expect(bearerToken('Bearer abc')).toBe('abc')
    expect(bearerToken('bearer   abc ')).toBe('abc')
    expect(bearerToken('Basic abc')).toBeNull()
    expect(bearerToken(undefined)).toBeNull()
  })

  it('checks expiry', () => {
    const now = Date.parse('2026-11-07T00:00:00Z')
    expect(patExpired('', now)).toBe(false)
    expect(patExpired('2026-11-06 00:00:00.000Z', now)).toBe(true)
    expect(patExpired('2026-11-08 00:00:00.000Z', now)).toBe(false)
    expect(patExpired('garbage', now)).toBe(false)
  })
})
