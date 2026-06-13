import { compare, parse, prerelease, satisfies, SemVer } from 'semver'

export type GhRelease = {
  tag_name: string
  prerelease: boolean
  draft: boolean
  assets: { name: string; browser_download_url: string }[]
}

export const fetchPocketBaseReleases = async (): Promise<GhRelease[]> => {
  const releases: GhRelease[] = []
  let page = 1

  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/pocketbase/pocketbase/releases?per_page=100&page=${page}`,
      { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'pockethost' } }
    )
    if (!res.ok) {
      throw new Error(`GitHub releases API failed (${res.status})`)
    }

    const batch = (await res.json()) as GhRelease[]
    if (batch.length === 0) break

    releases.push(...batch)
    if (batch.length < 100) break
    page++
  }

  return releases
}

export const latestPerMinor = (releases: GhRelease[], semverRange: string): SemVer[] => {
  const byMinor = new Map<string, SemVer>()

  for (const release of releases) {
    if (release.draft || release.prerelease) continue

    const version = parse(release.tag_name.replace(/^v/i, ''))
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

export const findReleaseAsset = (release: GhRelease, assetName: string) =>
  release.assets.find((asset) => asset.name === assetName)
