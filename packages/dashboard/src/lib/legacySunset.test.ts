import { describe, expect, it } from 'vitest'
import { isLegacyPocketBaseVersion } from './legacySunset'

describe('isLegacyPocketBaseVersion', () => {
  it('flags 0.22 and older', () => {
    expect(isLegacyPocketBaseVersion('0.22.*')).toBe(true)
    expect(isLegacyPocketBaseVersion('0.22.58')).toBe(true)
    expect(isLegacyPocketBaseVersion('0.7.*')).toBe(true)
  })

  it('leaves 0.23 and later alone', () => {
    expect(isLegacyPocketBaseVersion('0.23.*')).toBe(false)
    expect(isLegacyPocketBaseVersion('0.41.1')).toBe(false)
    expect(isLegacyPocketBaseVersion('1.0.*')).toBe(false)
  })

  it('ignores missing or malformed versions', () => {
    expect(isLegacyPocketBaseVersion(undefined)).toBe(false)
    expect(isLegacyPocketBaseVersion('')).toBe(false)
    expect(isLegacyPocketBaseVersion('latest')).toBe(false)
  })
})
