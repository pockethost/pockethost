import { describe, expect, it } from 'vitest'
import {
  OVER_LIMIT_GRACE_MS,
  allowanceLabel,
  allowanceParts,
  createLimitError,
  instanceAllowance,
  pickExcessInstances,
  planLapse,
  planOverLimit,
  powerOnLimitError,
  type LimitInstance,
} from './instanceLimits'

const NOW = Date.parse(`2026-11-08T12:00:00Z`)
const ARCHIVED = `Archived: This instance was archived after 12 months without use.`

const inst = (id: string, power: boolean, updated: string, suspension = ``): LimitInstance => ({
  id,
  power,
  updated,
  suspension,
})

describe('instanceAllowance', () => {
  it('uses subscription_quantity, never below 0', () => {
    expect(instanceAllowance({ subscription_quantity: 3 })).toBe(3)
    expect(instanceAllowance({ subscription_quantity: null })).toBe(0)
    expect(instanceAllowance({ subscription_quantity: -38 })).toBe(0)
  })
})

describe('bonus instances', () => {
  it('adds bonus to the paid allowance', () => {
    expect(allowanceParts({ subscription_quantity: 2, bonus_instances: 3 })).toEqual({ paid: 2, bonus: 3, total: 5 })
    expect(instanceAllowance({ subscription_quantity: 2, bonus_instances: 3 })).toBe(5)
  })

  it('counts bonus only while at least one instance is paid', () => {
    expect(allowanceParts({ subscription_quantity: 0, bonus_instances: 4 })).toEqual({ paid: 0, bonus: 0, total: 0 })
    expect(instanceAllowance({ subscription_quantity: null, bonus_instances: 4 })).toBe(0)
  })

  it('never goes below zero or uses fractions', () => {
    expect(allowanceParts({ subscription_quantity: 1, bonus_instances: -5 })).toEqual({ paid: 1, bonus: 0, total: 1 })
    expect(allowanceParts({ subscription_quantity: 1.9, bonus_instances: 1.9 })).toEqual({
      paid: 1,
      bonus: 1,
      total: 2,
    })
  })

  it('labels the split only when there is a bonus', () => {
    expect(allowanceLabel({ paid: 2, bonus: 1, total: 3 })).toBe(`3 instances (2 paid + 1 bonus)`)
    expect(allowanceLabel({ paid: 1, bonus: 0, total: 1 })).toBe(`1 instance`)
  })

  it('names the split in limit errors', () => {
    const owned = [inst(`a`, true, `2026-11-01`), inst(`b`, true, `2026-11-01`), inst(`c`, false, `2026-11-01`)]
    const parts = allowanceParts({ subscription_quantity: 2, bonus_instances: 1 })
    expect(createLimitError(owned, parts)).toMatch(/includes 3 instances \(2 paid \+ 1 bonus\) and you have 3/)
    expect(powerOnLimitError(`c`, owned, parts)).toBeNull()
    expect(createLimitError(owned.slice(0, 2), parts)).toBeNull()
  })

  it('lets the over-limit sweep keep bonus instances running', () => {
    const owned = [inst(`a`, true, `2026-11-01`), inst(`b`, true, `2026-11-02`), inst(`c`, true, `2026-11-03`)]
    expect(planOverLimit({ subscription_quantity: 2, bonus_instances: 1 }, owned, NOW).kind).toBe(`ok`)
    expect(planOverLimit({ subscription_quantity: 2, bonus_instances: 0 }, owned, NOW).kind).toBe(`start`)
  })
})

describe('createLimitError', () => {
  it('allows creating while under the allowance', () => {
    expect(createLimitError([inst(`a`, true, `2026-11-01 00:00:00.000Z`)], 2)).toBeNull()
  })

  it('counts powered-off instances', () => {
    const owned = [inst(`a`, true, `2026-11-01`), inst(`b`, false, `2026-11-01`)]
    expect(createLimitError(owned, 2)).toMatch(/includes 2 instances and you have 2/)
  })

  it('does not count archived instances', () => {
    const owned = [inst(`a`, true, `2026-11-01`), inst(`b`, false, `2026-11-01`, ARCHIVED)]
    expect(createLimitError(owned, 2)).toBeNull()
  })

  it('explains an allowance of 0', () => {
    expect(createLimitError([], 0)).toMatch(/doesn't include any instances/)
  })
})

describe('powerOnLimitError', () => {
  const owned = [inst(`a`, true, `2026-11-01`), inst(`b`, true, `2026-11-02`), inst(`c`, false, `2026-11-03`)]

  it('refuses powering on when the allowance is already running', () => {
    expect(powerOnLimitError(`c`, owned, 2)).toMatch(/includes 2 instances and 2 are already running/)
  })

  it('allows it when there is room', () => {
    expect(powerOnLimitError(`c`, owned, 3)).toBeNull()
  })

  it('never fails for an instance that is already on', () => {
    expect(powerOnLimitError(`a`, owned, 2)).toBeNull()
  })

  it('ignores archived instances', () => {
    const withArchived = [...owned.slice(0, 1), inst(`b`, true, `2026-11-02`, ARCHIVED), owned[2]!]
    expect(powerOnLimitError(`c`, withArchived, 2)).toBeNull()
  })
})

describe('pickExcessInstances', () => {
  it('picks the least recently updated powered-on instances', () => {
    const owned = [
      inst(`new`, true, `2026-11-07 10:00:00.000Z`),
      inst(`old`, true, `2026-01-01 10:00:00.000Z`),
      inst(`mid`, true, `2026-06-01 10:00:00.000Z`),
      inst(`off`, false, `2025-01-01 10:00:00.000Z`),
    ]
    expect(pickExcessInstances(owned, 1).map((i) => i.id)).toEqual([`old`, `mid`])
  })

  it('returns nothing when within the allowance', () => {
    expect(pickExcessInstances([inst(`a`, true, `2026-11-01`)], 1)).toEqual([])
  })
})

describe('planOverLimit', () => {
  const over = [inst(`a`, true, `2026-11-01`), inst(`b`, true, `2026-11-02`)]

  it('is ok when within the limit', () => {
    expect(planOverLimit({ subscription_quantity: 2 }, over, NOW)).toEqual({ kind: 'ok' })
  })

  it('clears a stale marker once back within the limit', () => {
    expect(
      planOverLimit({ subscription_quantity: 2, over_limit_since: `2026-11-07 00:00:00.000Z` }, over, NOW)
    ).toEqual({ kind: 'clear' })
  })

  it('starts the grace period the first time it sees an account over', () => {
    const step = planOverLimit({ subscription_quantity: 1 }, over, NOW)
    expect(step.kind).toBe('start')
    if (step.kind !== 'start') return
    expect(step.excess.map((i) => i.id)).toEqual([`a`])
    expect(step.deadline.getTime()).toBe(NOW + OVER_LIMIT_GRACE_MS)
  })

  it('waits during the grace period', () => {
    const since = new Date(NOW - OVER_LIMIT_GRACE_MS + 60_000).toISOString()
    expect(planOverLimit({ subscription_quantity: 1, over_limit_since: since }, over, NOW).kind).toBe('wait')
  })

  it('powers off after the grace period', () => {
    const since = new Date(NOW - OVER_LIMIT_GRACE_MS).toISOString().replace(`T`, ` `)
    const step = planOverLimit({ subscription_quantity: 1, over_limit_since: since }, over, NOW)
    expect(step).toEqual({ kind: 'power-off', excess: [over[0]] })
  })

  it('leaves accounts with no instances in their plan alone', () => {
    expect(planOverLimit({ subscription_quantity: 0 }, over, NOW)).toEqual({ kind: 'ok' })
    expect(planOverLimit({ subscription_quantity: 0, over_limit_since: `2026-11-01` }, over, NOW)).toEqual({
      kind: 'clear',
    })
  })
})

describe('planLapse', () => {
  const on = [inst(`a`, true, `2026-11-01`), inst(`b`, false, `2026-11-02`)]
  const allOff = [inst(`b`, false, `2026-11-02`)]

  it('notifies when the plan drops to 0 with instances set to run', () => {
    expect(planLapse({ subscription_quantity: 0 }, on, true)).toEqual({ kind: 'notify' })
  })

  it('notifies only once per lapse', () => {
    expect(planLapse({ subscription_quantity: 0, lapsed_since: `2026-11-08 00:00:00.000Z` }, on, true)).toEqual({
      kind: 'ok',
    })
  })

  it('leaves accounts that never paid alone', () => {
    expect(planLapse({ subscription_quantity: 0 }, on, false)).toEqual({ kind: 'ok' })
  })

  it('stays quiet when nothing is set to run', () => {
    expect(planLapse({ subscription_quantity: 0 }, allOff, true)).toEqual({ kind: 'ok' })
    expect(planLapse({ subscription_quantity: 0 }, [], true)).toEqual({ kind: 'ok' })
  })

  it('ignores archived instances', () => {
    expect(planLapse({ subscription_quantity: 0 }, [{ ...on[0]!, suspension: `Archived: old` }], true)).toEqual({
      kind: 'ok',
    })
  })

  it('clears the marker once the plan includes instances again', () => {
    expect(planLapse({ subscription_quantity: 1, lapsed_since: `2026-11-08 00:00:00.000Z` }, on, true)).toEqual({
      kind: 'clear',
    })
    expect(planLapse({ subscription_quantity: 1 }, on, true)).toEqual({ kind: 'ok' })
  })
})
