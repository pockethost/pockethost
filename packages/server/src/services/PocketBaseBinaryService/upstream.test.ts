import { describe, expect, it } from 'vitest'
import { findMissingVersions, parseUpstreamTags } from './upstream'

describe('parseUpstreamTags', () => {
  it('keeps stable tags, drops prereleases and peeled refs', () => {
    const refs = [
      '003f9d28 refs/tags/v0.41.1',
      '003f9d29 refs/tags/v0.41.1^{}',
      '003f9d30 refs/tags/v0.41.0-rc.1',
      '003f9d31 refs/tags/v0.22.58',
      '003f9d32 refs/heads/master',
    ].join('\n')
    expect(parseUpstreamTags(refs)).toEqual(['0.22.58', '0.41.1'])
  })
})

describe('findMissingVersions', () => {
  const known = ['0.22.57', '0.40.6', '0.41.1']

  it('reports newer patches of known minors and newer minors', () => {
    expect(findMissingVersions(known, ['0.22.58', '0.40.6', '0.41.2', '0.42.0'])).toEqual([
      '0.22.58',
      '0.41.2',
      '0.42.0',
    ])
  })

  it('returns only the newest missing patch per minor', () => {
    expect(findMissingVersions(known, ['0.41.2', '0.41.3', '0.42.0', '0.42.1'])).toEqual(['0.41.3', '0.42.1'])
  })

  it('ignores older patches and minors we never listed', () => {
    expect(findMissingVersions(known, ['0.22.10', '0.30.1', '0.41.0'])).toEqual([])
  })
})
