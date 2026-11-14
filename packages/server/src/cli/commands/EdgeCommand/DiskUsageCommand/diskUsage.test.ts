import { describe, expect, it } from 'vitest'
import { bucketTotals, localInstances, planStatsWrites } from './diskUsage'

const GB = 1024 ** 3

describe(`localInstances`, () => {
  it(`keeps instances placed on this edge and legacy ones with no edge`, () => {
    const got = localInstances(
      [{ id: `a`, edge: `E` }, { id: `b`, edge: `` }, { id: `c` }, { id: `d`, edge: `OTHER` }],
      `E`
    )
    expect(got.map((i) => i.id)).toEqual([`a`, `b`, `c`])
  })
})

describe(`planStatsWrites`, () => {
  it(`one row per measured instance; no folder is 0; failed ones are left out; existing rows are updated`, () => {
    const writes = planStatsWrites(
      [{ id: `a` }, { id: `b` }, { id: `c` }],
      new Map([[`a`, 100]]),
      new Set([`c`]),
      [{ id: `row-a`, instance: `a` }],
      `E`,
      `2026-11-14T05:00:00.000Z`
    )
    expect(writes).toEqual([
      { id: `row-a`, instance: `a`, edge: `E`, disk_bytes: 100, disk_measured: `2026-11-14T05:00:00.000Z` },
      { id: undefined, instance: `b`, edge: `E`, disk_bytes: 0, disk_measured: `2026-11-14T05:00:00.000Z` },
    ])
  })
})

describe(`bucketTotals`, () => {
  it(`counts sizes per band`, () => {
    const b = bucketTotals([0, 0, 1, 2 * GB, 10 * GB, 30 * GB])
    expect(Object.fromEntries(b.map((x) => [x.label, x.count]))).toEqual({
      '0': 2,
      '< 100 MB': 1,
      '100 MB - 1 GB': 0,
      '1 - 10 GB': 2,
      '10 - 25 GB': 0,
      '> 25 GB': 1,
    })
  })
})
