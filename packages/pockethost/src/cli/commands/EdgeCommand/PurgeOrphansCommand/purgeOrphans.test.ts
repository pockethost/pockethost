import { describe, expect, it } from 'vitest'
import { isQuarantineExpired, mkQuarantineName, parseQuarantineName } from './purgeOrphans'

describe('mkQuarantineName', () => {
  it('formats id and epoch ms', () => {
    expect(mkQuarantineName('abc123def456ghi', 1_700_000_000_000)).toBe('abc123def456ghi.1700000000000')
  })
})

describe('parseQuarantineName', () => {
  it('round-trips mkQuarantineName', () => {
    const id = 'abc123def456ghi'
    const at = 1_700_000_000_000
    expect(parseQuarantineName(mkQuarantineName(id, at))).toEqual({ id, quarantinedAt: at })
  })

  it('rejects invalid names', () => {
    expect(parseQuarantineName('not-an-id')).toBeNull()
    expect(parseQuarantineName('abc123def456ghi')).toBeNull()
    expect(parseQuarantineName('abc123def456ghi.not-a-number')).toBeNull()
    expect(parseQuarantineName('tooshort.123')).toBeNull()
  })
})

describe('isQuarantineExpired', () => {
  const quarantinedAt = 1_000_000
  const days = 30

  it('is not expired before retention ends', () => {
    const now = quarantinedAt + days * 86_400_000 - 1
    expect(isQuarantineExpired(quarantinedAt, now, days)).toBe(false)
  })

  it('is expired at exactly retention boundary', () => {
    const now = quarantinedAt + days * 86_400_000
    expect(isQuarantineExpired(quarantinedAt, now, days)).toBe(true)
  })

  it('is expired after retention', () => {
    const now = quarantinedAt + days * 86_400_000 + 1
    expect(isQuarantineExpired(quarantinedAt, now, days)).toBe(true)
  })
})
