/** PocketBase 0.22 and older is sunset: announced Nov 8, 2026, cutoff 90 days later. */
export const LEGACY_SUNSET_DATE = 'February 6, 2027'
export const LEGACY_SUNSET_BLOG = '/blog/pocketbase-022-sunset'

/** True for 0.22 and older (`0.22.*`, `0.19.3`, ...). Unparseable versions are not treated as legacy. */
export const isLegacyPocketBaseVersion = (version: string | undefined | null): boolean => {
  const match = /^(\d+)\.(\d+)(?:\.|$)/.exec((version ?? '').trim())
  if (!match) return false
  return Number(match[1]) === 0 && Number(match[2]) <= 22
}

/** The fields the banner needs from an instance record. */
export type LegacySunsetInstance = { id: string; subdomain: string; version: string }

/** How many affected instances the banner names before collapsing the rest into "and N more". */
export const LEGACY_SUNSET_NAMED_MAX = 3

/** The user's instances on 0.22 or older, sorted by name. */
export const legacyInstances = <T extends LegacySunsetInstance>(instances: T[] | Record<string, T>): T[] =>
  (Array.isArray(instances) ? instances : Object.values(instances))
    .filter((i) => isLegacyPocketBaseVersion(i.version))
    .sort((a, b) => a.subdomain.localeCompare(b.subdomain))

export type LegacySunsetSummary<T extends LegacySunsetInstance> = {
  /** The instance whose page is open, when it is affected. */
  current: T | undefined
  /** Other affected instances named in the banner. */
  named: T[]
  /** Other affected instances behind "and N more". */
  hidden: T[]
  total: number
}

/**
 * Splits affected instances for the account-level banner. The open instance (if affected) leads, then up to `max`
 * others by name; the rest go behind "and N more".
 */
export const summarizeLegacyInstances = <T extends LegacySunsetInstance>(
  affected: T[],
  currentId?: string,
  max = LEGACY_SUNSET_NAMED_MAX
): LegacySunsetSummary<T> => {
  const current = currentId ? affected.find((i) => i.id === currentId) : undefined
  const others = affected.filter((i) => i !== current)
  const room = Math.max(0, max - (current ? 1 : 0))
  // Don't hide a single instance behind "and 1 more"; just name it.
  const cut = others.length - room === 1 ? others.length : room
  return { current, named: others.slice(0, cut), hidden: others.slice(cut), total: affected.length }
}
