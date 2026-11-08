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
 * anything known. Returns only the newest missing patch per minor; older patches and long-gone minors are ignored.
 */
export const findMissingVersions = (known: string[], upstream: string[]) => {
  const newestByMinor = new Map<string, string>()
  for (const version of known) {
    const current = newestByMinor.get(minorKey(version))
    if (!current || compare(version, current) > 0) newestByMinor.set(minorKey(version), version)
  }
  const newestKnown = [...known].sort(rcompare)[0]

  const missing = new Map<string, string>()
  for (const version of upstream) {
    const current = newestByMinor.get(minorKey(version))
    const isMissing = current ? compare(version, current) > 0 : !newestKnown || compare(version, newestKnown) > 0
    const pending = missing.get(minorKey(version))
    if (isMissing && (!pending || compare(version, pending) > 0)) missing.set(minorKey(version), version)
  }
  return [...missing.values()].sort(compare)
}
