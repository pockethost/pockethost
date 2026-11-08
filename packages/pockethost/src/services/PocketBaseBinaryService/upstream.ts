import { compare, parse, prerelease, rcompare } from 'semver'

/** Public git refs of the PocketBase repo (plain HTTP, no git binary needed). */
export const UPSTREAM_GIT_REFS = 'https://ganigeorgiev.com/git/pocketbase/pocketbase/info/refs?service=git-upload-pack'

/** Stable release versions tagged upstream, oldest first. */
export const fetchUpstreamVersions = async () => {
  const res = await fetch(UPSTREAM_GIT_REFS)
  if (!res.ok) throw new Error(`GET ${UPSTREAM_GIT_REFS} failed (${res.status})`)
  return parseUpstreamTags(await res.text())
}

export const parseUpstreamTags = (refs: string) => {
  const tags = new Set<string>()
  for (const [, tag] of refs.matchAll(/refs\/tags\/v([^\s^]+)/g)) {
    const version = parse(tag)
    if (version && !prerelease(version)) tags.add(version.format())
  }
  return [...tags].sort(compare)
}

const minorKey = (version: string) => version.split('.').slice(0, 2).join('.')

/**
 * Upstream releases the manifest is missing: newer than everything known for the same minor, or a new minor newer than
 * anything known. Older patches and long-gone minors are ignored.
 */
export const findMissingVersions = (known: string[], upstream: string[]) => {
  const newestByMinor = new Map<string, string>()
  for (const version of known) {
    const current = newestByMinor.get(minorKey(version))
    if (!current || compare(version, current) > 0) newestByMinor.set(minorKey(version), version)
  }
  const newestKnown = [...known].sort(rcompare)[0]

  return upstream.filter((version) => {
    const current = newestByMinor.get(minorKey(version))
    if (current) return compare(version, current) > 0
    return !newestKnown || compare(version, newestKnown) > 0
  })
}
