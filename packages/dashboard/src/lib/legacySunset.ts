/** PocketBase 0.22 and older is sunset: announced Nov 8, 2026, cutoff 90 days later. */
export const LEGACY_SUNSET_DATE = 'February 6, 2027'
export const LEGACY_SUNSET_BLOG = '/blog/pocketbase-022-sunset'

/** True for 0.22 and older (`0.22.*`, `0.19.3`, ...). Unparseable versions are not treated as legacy. */
export const isLegacyPocketBaseVersion = (version: string | undefined | null): boolean => {
  const match = /^(\d+)\.(\d+)(?:\.|$)/.exec((version ?? '').trim())
  if (!match) return false
  return Number(match[1]) === 0 && Number(match[2]) <= 22
}
