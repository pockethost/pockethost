import { find, last } from '@s-libs/micro-dash'
import { assertExists } from './assert'

export const GO_VERSION = `1.19.3`

export const RELEASES = {
  ermine: {
    weight: 1,
    versions: ['0.7.7', '0.7.8', '0.7.9', '0.7.10'],
  },
  lollipop: {
    weight: 2,
    versions: [
      '0.8.0-rc1',
      '0.8.0-rc2',
      '0.8.0-rc3',
      '0.8.0-rc4',
      '0.8.0',
      '0.9.0',
      '0.9.1',
      '0.9.2',
      '0.10.0',
      '0.10.1',
      '0.10.2',
      '0.10.3',
      '0.10.4',
    ],
  },
}

export type PlatformId = keyof typeof RELEASES
export type VersionId = string

export const LATEST_PLATFORM: keyof typeof RELEASES = 'lollipop'

export const USE_LATEST_VERSION = 'latest'

function assertPlatform(platformId: string): asserts platformId is PlatformId {
  const hasPlatform = platformId in RELEASES
  if (!hasPlatform) {
    throw new Error(`Expected ${platformId} to exist here`)
  }
}

export { assertPlatform }

export const versionFor = (platformId: PlatformId, version: VersionId) => {
  const platform = RELEASES[platformId]
  if (version === USE_LATEST_VERSION) {
    const _v = last(platform.versions)
    assertExists(_v, `Expected ${platformId} to have versions (latest)`)
    return _v
  }
  const _v = find(platform.versions, (v) => v === version)
  assertExists(_v, `Expected ${platformId} to have version (${version})`)
  return _v
}

export const binFor = (
  platformId: PlatformId,
  version: VersionId = 'latest'
) => {
  const _version = versionFor(platformId, version)
  return `pocketbase-go${GO_VERSION}-${platformId}-${_version}`
}

export const humanVersion = (platformId: PlatformId, version: VersionId) => {
  const platform = RELEASES[platformId]
  const _version = versionFor(platformId, version)
  const humanVersion =
    version === USE_LATEST_VERSION ? `${_version} (latest)` : _version
  return humanVersion
}
