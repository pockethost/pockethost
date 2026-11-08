import { valid } from 'semver'
import { describe, expect, it } from 'vitest'
import { findRelease, latestPerMinor, manifestVersions } from './releases'
import manifest from './versions.json'

const linuxAmd64 = { os: 'linux', arch: 'amd64' } as const

describe('versions.json', () => {
  it('has valid versions, known hosts, and sha256 for both Linux builds', () => {
    for (const [version, entry] of Object.entries(manifest.versions)) {
      expect(valid(version), version).toBe(version)
      expect(Object.keys(manifest.hosts), version).toContain(entry.host)
      expect(entry.sha256.linux_amd64, version).toMatch(/^[0-9a-f]{64}$/)
      expect(entry.sha256.linux_arm64, version).toMatch(/^[0-9a-f]{64}$/)
    }
  })
})

describe('latestPerMinor', () => {
  it('keeps the newest stable patch per minor within range', () => {
    const versions = ['0.22.57', '0.22.58', '0.41.0', '0.41.1', '0.41.2-rc.1', '1.0.0']
    expect(latestPerMinor(versions, '<1.0.0').map((v) => v.format())).toEqual(['0.41.1', '0.22.58'])
  })

  it('selects from the manifest', () => {
    const targets = latestPerMinor(manifestVersions(), '<1.0.0').map((v) => v.format())
    expect(targets).toContain('0.41.1')
    expect(targets).toContain('0.40.6')
  })
})

describe('findRelease', () => {
  it('builds the ganigeorgiev.com URL for post-move releases', () => {
    const release = findRelease('v0.41.1', linuxAmd64)
    expect(release.url).toBe(
      'https://ganigeorgiev.com/meta/pocketbase/pocketbase/download/v0.41.1/pocketbase_0.41.1_linux_amd64.zip'
    )
    expect(release.sha256).toBe('7504ec99a85fe405fc9941b4d94bdea20733b53707c8251b66fd0daa1444347e')
  })

  it('builds the GitHub URL for archived releases', () => {
    expect(findRelease('0.40.6', linuxAmd64).url).toBe(
      'https://github.com/pocketbase/pocketbase/releases/download/v0.40.6/pocketbase_0.40.6_linux_amd64.zip'
    )
  })

  it('throws for versions missing from the manifest', () => {
    expect(() => findRelease('0.40.5', linuxAmd64)).toThrow(/pb:versions add 0.40.5/)
  })
})
