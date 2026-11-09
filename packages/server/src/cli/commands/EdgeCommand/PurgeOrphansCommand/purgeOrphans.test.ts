import { describe, expect, it } from 'vitest'
import { isQuarantineExpired, mkQuarantineName, parseQuarantineName, planIceboxOrphans } from './purgeOrphans'

describe('mkQuarantineName', () => {
  it('formats id and epoch ms', () => {
    expect(mkQuarantineName('abc123def456ghi', 1_700_000_000_000)).toBe('abc123def456ghi.1700000000000')
  })
})

describe('parseQuarantineName', () => {
  it('round-trips mkQuarantineName', () => {
    const id = 'abc123def456ghi'
    const at = 1_700_000_000_000
    expect(parseQuarantineName(mkQuarantineName(id, at))).toEqual({ id, quarantinedAt: at })
  })

  it('rejects invalid names', () => {
    expect(parseQuarantineName('not-an-id')).toBeNull()
    expect(parseQuarantineName('abc123def456ghi')).toBeNull()
    expect(parseQuarantineName('abc123def456ghi.not-a-number')).toBeNull()
    expect(parseQuarantineName('tooshort.123')).toBeNull()
  })
})

describe('isQuarantineExpired', () => {
  const quarantinedAt = 1_000_000
  const days = 30

  it('is not expired before retention ends', () => {
    const now = quarantinedAt + days * 86_400_000 - 1
    expect(isQuarantineExpired(quarantinedAt, now, days)).toBe(false)
  })

  it('is expired at exactly retention boundary', () => {
    const now = quarantinedAt + days * 86_400_000
    expect(isQuarantineExpired(quarantinedAt, now, days)).toBe(true)
  })

  it('is expired after retention', () => {
    const now = quarantinedAt + days * 86_400_000 + 1
    expect(isQuarantineExpired(quarantinedAt, now, days)).toBe(true)
  })
})

describe('planIceboxOrphans', () => {
  const zip = (instanceId: string, zipName = '@auto_pb_backup_x.zip') => ({
    instanceId,
    zipName,
    size: 10,
    modTimeMs: 0,
  })
  const live = 'aaaaaaaaaaaaaaa'
  const held = 'bbbbbbbbbbbbbbb'
  const gone = 'ccccccccccccccc'

  it('keeps zips of instances that still exist', () => {
    const plan = planIceboxOrphans([zip(live), zip(live, 'b.zip')], new Set([live]), new Set())
    expect(plan).toEqual({ toDelete: [], heldIds: [] })
  })

  it('holds zips while local data is still in quarantine', () => {
    const plan = planIceboxOrphans([zip(held), zip(held, 'b.zip')], new Set([live]), new Set([held]))
    expect(plan).toEqual({ toDelete: [], heldIds: [held] })
  })

  it('deletes zips of deleted instances with no quarantine', () => {
    const objects = [zip(live), zip(held), zip(gone), zip(gone, 'b.zip')]
    const plan = planIceboxOrphans(objects, new Set([live]), new Set([held]))
    expect(plan.toDelete).toEqual([zip(gone), zip(gone, 'b.zip')])
    expect(plan.heldIds).toEqual([held])
  })

  it('an existing instance wins over a stale quarantine entry', () => {
    const plan = planIceboxOrphans([zip(live)], new Set([live]), new Set([live]))
    expect(plan).toEqual({ toDelete: [], heldIds: [] })
  })
})
