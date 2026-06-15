import { describe, expect, it } from 'vitest'
import { maxSatisfyingVersionFromList } from './maxSatisfyingVersion'

describe('maxSatisfyingVersionFromList', () => {
  const versions = ['0.23.5', '0.22.8', '0.22.1', '0.21.3']

  it('resolves a minor wildcard range', () => {
    expect(maxSatisfyingVersionFromList(versions, '0.22.*')).toBe('0.22.8')
  })

  it('returns null when nothing satisfies the range', () => {
    expect(maxSatisfyingVersionFromList(versions, '0.24.*')).toBeNull()
  })

  it('excludes prereleases by default', () => {
    expect(maxSatisfyingVersionFromList(['0.22.0-beta.1', '0.22.0'], '0.22.*')).toBe('0.22.0')
  })
})
