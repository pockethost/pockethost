export const POCKETBASE_VERSIONS_SETTING = 'pocketbase_versions'

export type PocketbaseVersionEntry = {
  range: string
  patch: string
}

export type PocketbaseVersionsValue = {
  versions: PocketbaseVersionEntry[]
  syncedAt?: string
}

const parsePocketbaseVersionsValue = (raw: unknown): PocketbaseVersionsValue | null => {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as PocketbaseVersionsValue
    } catch {
      return null
    }
  }
  return raw as PocketbaseVersionsValue
}

export const readPocketbaseVersions = (): PocketbaseVersionEntry[] => {
  try {
    const record = $app.findFirstRecordByData('settings', 'name', POCKETBASE_VERSIONS_SETTING)
    const value = parsePocketbaseVersionsValue(record.getString('value'))
    if (!value?.versions?.length) return []
    return value.versions
  } catch {
    return []
  }
}

/**
 * Every minor wildcard version (e.g. `0.22.*`) from mothership settings, including legacy ones. Edges need the full
 * catalog to keep running existing legacy instances, so don't filter this one.
 */
export const listVersions = (): string[] => readPocketbaseVersions().map((entry) => entry.range)

/**
 * Oldest PocketBase minor that new instances and version changes may use. 0.22 and older are being sunset; existing
 * instances on them keep running until the cutoff.
 */
export const MIN_SELECTABLE_POCKETBASE_VERSION = { major: 0, minor: 23 } as const

/** Whether a range like `0.23.*` (or a full version) is at or above the selectable floor. */
export const isSelectableVersion = (range: string): boolean => {
  const match = /^(\d+)\.(\d+)(?:\.|$)/.exec(range.trim())
  if (!match) return false
  const major = Number(match[1])
  const minor = Number(match[2])
  const min = MIN_SELECTABLE_POCKETBASE_VERSION
  return major > min.major || (major === min.major && minor >= min.minor)
}

/**
 * Whether a range is a PocketOne release line (`p1:0.0.*`). PocketOne versions are valid on an instance when the
 * mothership's list has them, but they aren't offered in the dashboard yet (sfo's Node edge can't run them).
 */
export const isPocketOneVersion = (range: string): boolean => /^p1:\d+\.\d+\.\*$/.test(range.trim())

/** Versions a user may pick for a new instance or a version change. */
export const listSelectableVersions = (): string[] => listVersions().filter(isSelectableVersion)

/** Error message for a version that isn't selectable, or null when it's fine. */
export const selectableVersionError = (version: unknown, selectable: string[]): string | null => {
  if (typeof version !== 'string' || !version) {
    return `A PocketBase version is required. Version must be one of: ${selectable.join(', ')}`
  }
  if (isPocketOneVersion(version)) {
    return listVersions().includes(version)
      ? null
      : `PocketOne ${version} is not offered. Version must be one of: ${selectable.join(', ')}`
  }
  if (!isSelectableVersion(version)) {
    return `PocketBase ${version} is no longer supported for new instances or version changes. Use 0.23 or later.`
  }
  if (selectable.length && !selectable.includes(version)) {
    return `Invalid version ${version}. Version must be one of: ${selectable.join(', ')}`
  }
  return null
}
