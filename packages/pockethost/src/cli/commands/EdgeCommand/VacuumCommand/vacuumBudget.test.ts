import { describe, expect, it } from 'vitest'
import { checkVacuumBudget } from './vacuumBudget'

const GB = 1024 ** 3

describe('checkVacuumBudget', () => {
  it('allows a vacuum when there is room for the temp copy and the rewrite', () => {
    expect(checkVacuumBudget(8 * GB, 20 * GB)).toEqual({ ok: true })
    expect(checkVacuumBudget(8 * GB, 16 * GB)).toEqual({ ok: true })
  })

  it('blocks a vacuum that would need more than the free space (the 2026-11-09 near-miss)', () => {
    // An ~17.6 GB temp copy with 17 GB free would have filled the disk.
    expect(checkVacuumBudget(17.6 * GB, 17 * GB)).toEqual({ ok: false, neededBytes: 35.2 * GB })
  })

  it('does not block when free space is unknown', () => {
    expect(checkVacuumBudget(8 * GB, undefined)).toEqual({ ok: true })
  })
})
