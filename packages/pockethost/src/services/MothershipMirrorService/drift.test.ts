import { describe, expect, it } from 'vitest'
import { changedKeys, findMirrorDrift, toPbDate } from './drift'

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
