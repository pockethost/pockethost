import { describe, expect, it } from 'vitest'
import { changedKeys, findDeletedIds, findMirrorDrift, isOlderThanMirrored, reconnectPlan, toPbDate } from './drift'

type Rec = { id: string; updated: string; power?: boolean; secrets?: Record<string, string>; status?: string }

const T0 = '2026-11-06 09:00:00.000Z'
const T1 = '2026-11-06 09:19:31.397Z'
const CUTOFF = '2026-11-06 10:00:00.000Z'

const mirrorOf = (...records: Rec[]) => {
  const byId = Object.fromEntries(records.map((r) => [r.id, r]))
  return (id: string) => byId[id]
}

describe('toPbDate', () => {
  it('formats like PocketBase datetimes', () => {
    expect(toPbDate(Date.parse('2026-11-06T09:19:31.397Z'))).toBe(T1)
  })
})

describe('changedKeys', () => {
  it('lists only changed field names, ignoring bookkeeping fields', () => {
    expect(
      changedKeys(
        { id: 'a', updated: T0, power: true, secrets: { A: '1' }, status: 'running' },
        { id: 'a', updated: T1, power: false, secrets: { A: '1', B: '2' }, status: 'running' }
      )
    ).toEqual(['power', 'secrets'])
  })
})

describe('findMirrorDrift', () => {
  it('flags a record the mirror holds an older version of (missed power-off)', () => {
    const mirrored: Rec = { id: 'ws', updated: T0, power: true }
    const fetched: Rec = { id: 'ws', updated: T1, power: false }
    expect(findMirrorDrift(mirrorOf(mirrored), [fetched], CUTOFF)).toEqual([
      { record: fetched, kind: 'stale', changedKeys: ['power'] },
    ])
  })

  it('flags a record missing from the mirror', () => {
    const fetched: Rec = { id: 'new', updated: T1 }
    expect(findMirrorDrift(mirrorOf(), [fetched], CUTOFF)).toEqual([
      { record: fetched, kind: 'missing', changedKeys: [] },
    ])
  })

  it('ignores records the mirror already has at the same or a newer version', () => {
    const same: Rec = { id: 'a', updated: T1, power: true }
    const newer: Rec = { id: 'b', updated: T1, power: true }
    expect(findMirrorDrift(mirrorOf(same, newer), [same, { id: 'b', updated: T0, power: false }], CUTOFF)).toEqual([])
  })

  it('skips changes newer than the cutoff, whose realtime event may still be in flight', () => {
    const mirrored: Rec = { id: 'ws', updated: T0, power: true }
    const fetched: Rec = { id: 'ws', updated: '2026-11-06 10:00:05.000Z', power: false }
    expect(findMirrorDrift(mirrorOf(mirrored), [fetched], CUTOFF)).toEqual([])
  })
})

describe('isOlderThanMirrored', () => {
  it('rejects an event older than the mirrored copy (out-of-order delivery)', () => {
    // Two rapid updates; PocketBase delivers the newer one first, then the older one.
    const newer: Rec = { id: 'a', updated: '2026-11-06 15:40:00.120Z', status: 'running' }
    const older: Rec = { id: 'a', updated: '2026-11-06 15:40:00.050Z', status: 'starting' }
    expect(isOlderThanMirrored(newer, older)).toBe(true)
  })

  it('accepts newer events, equal timestamps, and records not yet mirrored', () => {
    expect(isOlderThanMirrored({ id: 'a', updated: T0 }, { id: 'a', updated: T1 })).toBe(false)
    expect(isOlderThanMirrored({ id: 'a', updated: T1 }, { id: 'a', updated: T1 })).toBe(false)
    expect(isOlderThanMirrored(undefined, { id: 'a', updated: T1 })).toBe(false)
  })

  it('accepts when either side has no timestamp', () => {
    expect(isOlderThanMirrored({ id: 'a', updated: '' }, { id: 'a', updated: T0 })).toBe(false)
    expect(isOlderThanMirrored({ id: 'a', updated: T1 }, { id: 'a', updated: '' })).toBe(false)
  })
})

describe('reconnectPlan', () => {
  it('catches up incrementally after a short gap and fully after a long one', () => {
    expect(reconnectPlan(1_000, 61_000, 10 * 60_000)).toBe('incremental')
    expect(reconnectPlan(0, 10 * 60_000, 10 * 60_000)).toBe('incremental')
    expect(reconnectPlan(0, 10 * 60_000 + 1, 10 * 60_000)).toBe('full')
    expect(reconnectPlan(1_000, 2_000, 0)).toBe('full') // disabled
  })
})

describe('findDeletedIds', () => {
  it('returns mirrored ids the mothership no longer has', () => {
    expect(findDeletedIds(['a', 'b', 'c'], ['a', 'c', 'd'])).toEqual(['b'])
    expect(findDeletedIds([], ['a'])).toEqual([])
    expect(findDeletedIds(['a'], [])).toEqual(['a'])
  })
})
