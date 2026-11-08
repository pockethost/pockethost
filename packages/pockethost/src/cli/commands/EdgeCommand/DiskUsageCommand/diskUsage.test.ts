import { describe, expect, it } from 'vitest'
import { bucketTotals, planUsageUpdates, sumByUser } from './diskUsage'

const GB = 1024 ** 3

describe(`sumByUser`, () => {
  it(`sums instance sizes per owner; instances without a folder count as 0`, () => {
    const { totals, unknown } = sumByUser(
      [
        { id: `a1`, uid: `u1` },
        { id: `a2`, uid: `u1` },
        { id: `b1`, uid: `u2` },
        { id: `c1`, uid: `u3` },
      ],
      new Map([
        [`a1`, 100],
        [`a2`, 50],
        [`b1`, 7],
        [`orphan`, 999],
      ])
    )
    expect(Object.fromEntries(totals)).toEqual({ u1: 150, u2: 7, u3: 0 })
    expect(unknown.size).toBe(0)
  })

  it(`marks owners of an unmeasured instance as unknown`, () => {
    const { totals, unknown } = sumByUser(
      [
        { id: `a1`, uid: `u1` },
        { id: `a2`, uid: `u1` },
        { id: `b1`, uid: `u2` },
      ],
      new Map([
        [`a1`, 100],
        [`b1`, 7],
      ]),
      new Set([`a2`])
    )
    expect(Object.fromEntries(totals)).toEqual({ u2: 7 })
    expect([...unknown]).toEqual([`u1`])
  })

  it(`ignores instances with no owner`, () => {
    const { totals } = sumByUser([{ id: `a1`, uid: `` }], new Map([[`a1`, 5]]))
    expect(totals.size).toBe(0)
  })
})

describe(`planUsageUpdates`, () => {
  const totals = new Map([
    [`u1`, 150],
    [`u2`, 7],
  ])

  it(`only updates users whose values changed`, () => {
    const updates = planUsageUpdates(
      [
        { id: `u1`, volume_storage_used: 150, object_storage_used: 0 },
        { id: `u2`, volume_storage_used: 3, object_storage_used: 0 },
      ],
      totals
    )
    expect(updates).toEqual([{ id: `u2`, volume_storage_used: 7, object_storage_used: 0, previous: 3 }])
  })

  it(`zeroes users with nothing on disk and clears object storage`, () => {
    const updates = planUsageUpdates(
      [
        { id: `u9`, volume_storage_used: 500, object_storage_used: 0 },
        { id: `u8`, volume_storage_used: 0, object_storage_used: 0 },
        { id: `u1`, volume_storage_used: 150, object_storage_used: 42 },
      ],
      totals
    )
    expect(updates.map((u) => [u.id, u.volume_storage_used, u.object_storage_used])).toEqual([
      [`u9`, 0, 0],
      [`u1`, 150, 0],
    ])
  })

  it(`writes users whose stored value is missing`, () => {
    expect(planUsageUpdates([{ id: `u8`, volume_storage_used: null }], totals)).toHaveLength(1)
  })

  it(`skips unknown users`, () => {
    expect(planUsageUpdates([{ id: `u1`, volume_storage_used: 1 }], totals, new Set([`u1`]))).toEqual([])
  })
})

describe(`bucketTotals`, () => {
  it(`counts users per size band`, () => {
    const b = bucketTotals([0, 0, 1, 2 * GB, 10 * GB, 30 * GB])
    expect(Object.fromEntries(b.map((x) => [x.label, x.users]))).toEqual({
      '0': 2,
      '< 100 MB': 1,
      '100 MB - 1 GB': 0,
      '1 - 10 GB': 2,
      '10 - 25 GB': 0,
      '> 25 GB': 1,
    })
  })
})
