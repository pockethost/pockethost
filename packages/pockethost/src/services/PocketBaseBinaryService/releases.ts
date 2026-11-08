import { compare, parse, prerelease, satisfies, SemVer } from 'semver'
import { mkAssetName, mkAssetSuffix, type PocketBasePlatform } from './platform'
import manifest from './versions.json'

/**
 * PocketBase releases come from versions.json, not from an upstream API. GitHub was archived on 2026-10-26 (last
 * releases 0.40.6 / 0.22.57); newer releases live only on ganigeorgiev.com, which doesn't re-host the old ones. Each
 * entry records its host and the sha256 of its Linux zips. Maintain it with `pnpm pb:versions add <version>` / `pnpm
 * pb:versions check`.
 */
export type PocketBaseRelease = {
  version: string
  url: string
  assetName: string
  sha256: string
}

type ManifestEntry = { host: string; sha256: Record<string, string | undefined> }

const hosts: Record<string, string> = manifest.hosts
const entries: Record<string, ManifestEntry> = manifest.versions

export const manifestVersions = () => Object.keys(entries)

export const latestPerMinor = (versions: string[], semverRange: string): SemVer[] => {
  const byMinor = new Map<string, SemVer>()

  for (const raw of versions) {
    const version = parse(raw.replace(/^v/i, ''))
    if (!version || prerelease(version)) continue
    if (!satisfies(version, semverRange)) continue

    const key = `${version.major}.${version.minor}`
    const existing = byMinor.get(key)
    if (!existing || compare(version, existing) > 0) {
      byMinor.set(key, version)
    }
  }

  return [...byMinor.values()].sort(compare).reverse()
}

export const findRelease = (version: string, platform: PocketBasePlatform): PocketBaseRelease => {
  const normalized = version.replace(/^v/i, '')
  const entry = entries[normalized]
  if (!entry) {
    throw new Error(`PocketBase ${normalized} is not in versions.json (run: pnpm pb:versions add ${normalized})`)
  }

  const template = hosts[entry.host]
  if (!template) {
    throw new Error(`Unknown host "${entry.host}" for PocketBase ${normalized} in versions.json`)
  }

  const suffix = mkAssetSuffix(platform)
  const sha256 = entry.sha256[suffix]
  if (!sha256) {
    throw new Error(`PocketBase ${normalized} has no ${suffix} build in versions.json`)
  }

  const assetName = mkAssetName(normalized, platform)
  const url = template.replaceAll('{version}', normalized).replaceAll('{file}', assetName)
  return { version: normalized, url, assetName, sha256 }
}
