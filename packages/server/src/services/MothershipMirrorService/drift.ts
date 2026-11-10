type MirroredRecord = { id: string; updated: string }

export type MirrorDrift<T extends MirroredRecord> = {
  record: T
  /** `missing`: not in the mirror at all. `stale`: the mirror holds an older version. */
  kind: 'missing' | 'stale'
  /** Names of fields whose values differ. Names only, never values (they can hold secrets). */
  changedKeys: string[]
}

const IGNORED_KEYS = new Set(['updated', 'created', 'collectionId', 'collectionName', 'expand'])

export const changedKeys = (before: object, after: object): string[] => {
  const a = before as Record<string, unknown>
  const b = after as Record<string, unknown>
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].filter((k) => !IGNORED_KEYS.has(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k])).sort()
}

/**
 * True when `incoming` is an older version than the copy the mirror already holds.
 *
 * PocketBase sends each realtime message from its own goroutine, so rapid updates to one record can arrive out of
 * order. Applying an older version after a newer one would leave the mirror stale. Equal timestamps are not considered
 * older: they can't be ordered, so the latest arrival wins.
 */
export const isOlderThanMirrored = (mirrored: MirroredRecord | undefined, incoming: MirroredRecord): boolean =>
  !!mirrored && !!incoming.updated && !!mirrored.updated && incoming.updated < mirrored.updated

/** PocketBase stores datetimes as `YYYY-MM-DD HH:MM:SS.sssZ`, which sorts lexicographically. */
export const toPbDate = (ms: number) => new Date(ms).toISOString().replace('T', ' ')

/**
 * Compares records fetched from the mothership against the mirror and returns the ones the mirror missed.
 *
 * Records updated after `cutoff` are skipped: their realtime event may still be in flight, so they are not yet evidence
 * of a missed event. The next check picks them up.
 */
export const findMirrorDrift = <T extends MirroredRecord>(
  getMirrored: (id: string) => T | undefined,
  fetched: T[],
  cutoff: string
): MirrorDrift<T>[] =>
  fetched.flatMap((record): MirrorDrift<T>[] => {
    if (record.updated > cutoff) return []
    const mirrored = getMirrored(record.id)
    if (!mirrored) return [{ record, kind: 'missing', changedKeys: [] }]
    if (mirrored.updated >= record.updated) return []
    return [{ record, kind: 'stale', changedKeys: changedKeys(mirrored, record) }]
  })

/** How a reconnect brings the mirror up to date: only what changed during a short gap, a full dump after a long one. */
export const reconnectPlan = (gapStartMs: number, nowMs: number, maxGapMs: number): 'incremental' | 'full' =>
  maxGapMs > 0 && nowMs - gapStartMs <= maxGapMs ? 'incremental' : 'full'

/** Ids the mirror holds that the mothership no longer has (deleted while the realtime stream was down). */
export const findDeletedIds = (mirroredIds: Iterable<string>, currentIds: Iterable<string>): string[] => {
  const current = new Set(currentIds)
  return [...mirroredIds].filter((id) => !current.has(id))
}
