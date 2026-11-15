import { describe, expect, it } from 'vitest'
import type { BillingItem } from './billingItems'
import {
  bonusForRenewals,
  isPaidRenewalInvoice,
  loyaltyBonus,
  loyaltyChainStart,
  loyaltyEndingEmail,
  loyaltyNote,
  loyaltyPurchaseEmail,
  loyaltyRenewalEmail,
  nextBonusAtRenewal,
  parseResumeToken,
  resumeToken,
  wholeMonthsBetween,
} from './loyalty'

const NOW = new Date(`2026-11-14T12:00:00Z`)

const sub = (
  id: string,
  sku: BillingItem['sku'],
  starts_at: string,
  status = `active`,
  ends_at?: string
): BillingItem => ({
  provider: `lemonsqueezy`,
  kind: `subscription`,
  external_id: id,
  sku,
  quantity: 1,
  status,
  starts_at,
  ends_at,
})
const monthly = (id: string, starts_at: string, status?: string, ends_at?: string) =>
  sub(id, `hosting.slot.recurring.month`, starts_at, status, ends_at)
const annual = (id: string, starts_at: string, status?: string, ends_at?: string) =>
  sub(id, `hosting.slot.recurring.year`, starts_at, status, ends_at)
const lifetime = (starts_at: string, sku: BillingItem['sku'] = `hosting.slot.lifetime`): BillingItem => ({
  provider: `lemonsqueezy`,
  kind: `order`,
  external_id: `o1`,
  sku,
  quantity: 1,
  status: `paid`,
  starts_at,
})

describe('schedule', () => {
  it('follows months 1, 4, 7, 10, 13 and caps at 5', () => {
    const got = [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 12, 13, 40].map(bonusForRenewals)
    expect(got).toEqual([0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 5])
    expect(bonusForRenewals(-3)).toBe(0)
    expect(bonusForRenewals(NaN)).toBe(0)
    expect([0, 1, 3, 4, 12, 13].map(nextBonusAtRenewal)).toEqual([1, 4, 4, 7, 13, null])
  })
  it('counts whole calendar months', () => {
    expect(wholeMonthsBetween(new Date(`2026-10-14T12:00:00Z`), NOW)).toBe(1)
    expect(wholeMonthsBetween(new Date(`2026-10-15T12:00:00Z`), NOW)).toBe(0)
    expect(wholeMonthsBetween(new Date(`2025-11-14T12:00:00Z`), NOW)).toBe(12)
  })
})

describe('chain', () => {
  it('starts at the first subscription and keeps going', () => {
    expect(loyaltyBonus([monthly(`a`, `2026-04-14T12:00:00Z`)], NOW)).toMatchObject({
      bonus: 3,
      basis: `renewals`,
      renewals: 7,
    })
  })

  it('a second instance never earns faster', () => {
    const items = [monthly(`a`, `2026-07-14T12:00:00Z`), monthly(`b`, `2026-07-14T12:00:00Z`)]
    expect(loyaltyBonus(items, NOW)).toMatchObject({ bonus: 2, renewals: 4 })
  })

  it('switching A to B in time keeps the original start', () => {
    const a = monthly(`a`, `2026-04-14T12:00:00Z`, `expired`, `2026-09-01T00:00:00Z`)
    const b = monthly(`b`, `2026-08-20T00:00:00Z`)
    expect(loyaltyBonus([a, b], NOW)).toMatchObject({ bonus: 3, renewals: 7 })
  })

  it('a short gap holds the chain but the gap days do not count', () => {
    const a = monthly(`a`, `2026-04-14T12:00:00Z`, `expired`, `2026-08-14T12:00:00Z`)
    const b = monthly(`b`, `2026-09-14T12:00:00Z`) // 31-day gap: over the 30-day window
    expect(loyaltyBonus([a, b], NOW).renewals).toBe(2) // new chain from Sep 14
    const c = monthly(`c`, `2026-09-03T12:00:00Z`) // 20-day gap: held
    expect(loyaltyBonus([a, c], NOW)).toMatchObject({ renewals: 6, bonus: 2 })
  })

  it('a lapse longer than the comeback window starts a new chain from 0', () => {
    const b = monthly(`b`, `2026-01-14T12:00:00Z`, `expired`, `2026-05-14T12:00:00Z`)
    const c = monthly(`c`, `2026-11-01T12:00:00Z`)
    expect(loyaltyBonus([b, c], NOW)).toMatchObject({ bonus: 0, basis: `none`, renewals: 0 })
  })

  it('no active subscription: no chain, bonus 0', () => {
    const a = monthly(`a`, `2026-01-14T12:00:00Z`, `expired`, `2026-10-01T00:00:00Z`)
    expect(loyaltyChainStart([a], NOW)).toBeUndefined()
    expect(loyaltyBonus([a], NOW).bonus).toBe(0)
  })

  it('cancelled but still in its paid period still counts', () => {
    const a = monthly(`a`, `2026-04-14T12:00:00Z`, `cancelled`, `2026-12-14T12:00:00Z`)
    expect(loyaltyBonus([a], NOW).bonus).toBe(3)
  })

  it('annual to monthly keeps the start date', () => {
    const y = annual(`y`, `2025-06-01T00:00:00Z`, `expired`, `2026-06-01T00:00:00Z`)
    const m = monthly(`m`, `2026-05-25T00:00:00Z`)
    expect(loyaltyBonus([y, m], NOW)).toMatchObject({ bonus: 5, basis: `renewals` })
  })

  it('a webhook just before the anniversary still sees the month', () => {
    const a = monthly(`a`, `2026-10-14T12:05:00Z`)
    expect(loyaltyBonus([a], NOW).renewals).toBe(1)
  })

  it('skips items without a start date', () => {
    const a = { ...monthly(`a`, ``), starts_at: undefined }
    expect(loyaltyBonus([a], NOW).bonus).toBe(0)
  })
})

describe('upfront and exclusions', () => {
  it('annual and lifetime get 5', () => {
    expect(loyaltyBonus([annual(`y`, `2026-11-01T00:00:00Z`)], NOW)).toMatchObject({ bonus: 5, basis: `upfront` })
    expect(loyaltyBonus([lifetime(`2026-11-01T00:00:00Z`)], NOW)).toMatchObject({ bonus: 5, basis: `upfront` })
  })
  it('legacy Flounder lifetime gets nothing', () => {
    expect(loyaltyBonus([lifetime(`2024-01-01T00:00:00Z`, `hosting.slot.lifetime.legacy_flounder`)], NOW).bonus).toBe(0)
  })
  it('excludes accounts with more paid instances than the cap', () => {
    expect(loyaltyBonus([monthly(`a`, `2025-01-01T00:00:00Z`)], NOW, 251)).toMatchObject({
      bonus: 0,
      basis: `excluded`,
    })
    expect(loyaltyBonus([annual(`y`, `2026-11-01T00:00:00Z`)], NOW, 6).bonus).toBe(0)
    expect(loyaltyBonus([monthly(`a`, `2025-01-01T00:00:00Z`)], NOW, 5).bonus).toBe(5)
  })
  it('ignores manual and baseline rows', () => {
    const manual: BillingItem = { ...annual(`baseline:u`, `2026-01-01T00:00:00Z`), provider: `manual`, kind: `manual` }
    expect(loyaltyBonus([manual], NOW).bonus).toBe(0)
  })
  it('writes a customer-facing note', () => {
    expect(loyaltyNote(loyaltyBonus([monthly(`a`, `2026-10-14T12:00:00Z`)], NOW))).toBe(
      `Loyalty bonus: 1 month subscribed`
    )
    expect(loyaltyNote(loyaltyBonus([annual(`y`, `2026-11-01T00:00:00Z`)], NOW))).toBe(
      `Loyalty bonus: 5 instances with your annual or lifetime plan`
    )
  })
})

describe('renewal email', () => {
  const at = (start: string) => loyaltyBonus([monthly(`a`, start)], NOW)
  it('first bonus gets its own fanfare', () => {
    expect(loyaltyRenewalEmail(at(`2026-10-14T12:00:00Z`))).toMatchObject({
      template: `bonus_first_earned`,
      vars: { current: `1`, next: `On your Feb 14, 2027 renewal`, max: `5` },
    })
  })
  it('fanfare when this month earned one', () => {
    expect(loyaltyRenewalEmail(at(`2026-07-14T12:00:00Z`))).toMatchObject({
      template: `bonus_earned`,
      vars: { current: `2` },
    })
  })
  it('progress when it did not', () => {
    expect(loyaltyRenewalEmail(at(`2026-09-14T12:00:00Z`))).toMatchObject({
      template: `bonus_progress`,
      vars: { current: `1`, next: `On your Jan 14, 2027 renewal` },
    })
  })
  it('fanfare at reaching 5, then nothing', () => {
    expect(loyaltyRenewalEmail(at(`2025-10-14T12:00:00Z`))).toMatchObject({
      template: `bonus_earned`,
      vars: { current: `5`, next: `You're at the max` },
    })
    expect(loyaltyRenewalEmail(at(`2025-09-14T12:00:00Z`))).toBeNull()
  })
  it('nothing for annual or lifetime', () => {
    expect(loyaltyRenewalEmail(loyaltyBonus([annual(`y`, `2025-11-14T12:00:00Z`)], NOW))).toBeNull()
  })
  it('one per chain month, whichever subscription renews', () => {
    const one = loyaltyRenewalEmail(at(`2026-09-14T12:00:00Z`))
    const two = loyaltyRenewalEmail(
      loyaltyBonus([monthly(`a`, `2026-09-14T12:00:00Z`), monthly(`b`, `2026-10-30T00:00:00Z`)], NOW)
    )
    expect(two?.ref).toBe(one?.ref)
  })
})

describe('purchase email', () => {
  it('new monthly chain: welcome with the first bonus date', () => {
    const r = loyaltyBonus([monthly(`a`, `2026-11-14T10:00:00Z`)], NOW)
    expect(loyaltyPurchaseEmail(r, `hosting.slot.recurring.month`, `subscription:a`)).toMatchObject({
      template: `bonus_welcome`,
      vars: { current: `0`, date: `Dec 14, 2026` },
    })
  })
  it('a second instance on an existing chain: nothing', () => {
    const r = loyaltyBonus([monthly(`a`, `2026-06-01T00:00:00Z`), monthly(`b`, `2026-11-14T10:00:00Z`)], NOW)
    expect(loyaltyPurchaseEmail(r, `hosting.slot.recurring.month`, `subscription:b`)).toBeNull()
  })
  it('annual and lifetime: their own welcome, once', () => {
    const y = loyaltyBonus([annual(`y`, `2026-11-14T10:00:00Z`)], NOW)
    expect(loyaltyPurchaseEmail(y, `hosting.slot.recurring.year`, `subscription:y`)?.template).toBe(
      `bonus_welcome_annual`
    )
    const l = loyaltyBonus([lifetime(`2026-11-14T10:00:00Z`)], NOW)
    expect(loyaltyPurchaseEmail(l, `hosting.slot.lifetime`, `order:o1`)?.template).toBe(`bonus_welcome_lifetime`)
  })
  it('monthly bought while on annual: nothing', () => {
    const r = loyaltyBonus([annual(`y`, `2026-06-01T00:00:00Z`), monthly(`m`, `2026-11-14T10:00:00Z`)], NOW)
    expect(loyaltyPurchaseEmail(r, `hosting.slot.recurring.month`, `subscription:m`)).toBeNull()
  })
  it('excluded accounts: nothing', () => {
    const r = loyaltyBonus([annual(`y`, `2026-11-14T10:00:00Z`)], NOW, 250)
    expect(loyaltyPurchaseEmail(r, `hosting.slot.recurring.year`, `subscription:y`)).toBeNull()
  })
})

describe('isPaidRenewalInvoice', () => {
  it('counts paid renewals only', () => {
    expect(isPaidRenewalInvoice({ billing_reason: `renewal`, status: `paid` })).toBe(true)
    expect(isPaidRenewalInvoice({ billing_reason: `initial`, status: `paid` })).toBe(false)
    expect(isPaidRenewalInvoice({ billing_reason: `renewal`, status: `pending` })).toBe(false)
    expect(isPaidRenewalInvoice({ billing_reason: `renewal`, status: `paid`, refunded: true })).toBe(false)
  })
})

describe('ending emails', () => {
  const urls = { resume: `https://r`, pricing: `https://p` }
  const ends = `2026-12-14T12:00:00Z`
  it('cancel before the first bonus: none version', () => {
    const items = [monthly(`a`, `2026-11-14T10:00:00Z`, `cancelled`, ends)]
    expect(loyaltyEndingEmail(`cancel`, items, `a`, ends, NOW, 1, urls)).toMatchObject({
      template: `bonus_cancelled_none`,
      vars: { ends: `Dec 14, 2026`, resume_url: `https://r` },
    })
  })
  it('cancel while earning and maxed', () => {
    const earning = [monthly(`a`, `2026-07-14T12:00:00Z`, `cancelled`, ends)]
    expect(loyaltyEndingEmail(`cancel`, earning, `a`, ends, NOW, 1, urls)).toMatchObject({
      template: `bonus_cancelled_earning`,
      vars: { current: `2` },
    })
    const yearly = [annual(`y`, `2025-12-14T12:00:00Z`, `cancelled`, ends)]
    expect(loyaltyEndingEmail(`cancel`, yearly, `y`, ends, NOW, 1, urls)?.template).toBe(`bonus_cancelled_maxed`)
  })
  it('cancelling one of two overlapping subscriptions: nothing', () => {
    const items = [monthly(`a`, `2026-07-14T12:00:00Z`, `cancelled`, ends), monthly(`b`, `2026-09-01T00:00:00Z`)]
    expect(loyaltyEndingEmail(`cancel`, items, `a`, ends, NOW, 2, urls)).toBeNull()
  })
  it('expired: last chance with the 30-day deadline and the bonus held', () => {
    const end = `2026-11-10T12:00:00Z`
    const items = [monthly(`a`, `2026-03-10T12:00:00Z`, `expired`, end)]
    expect(loyaltyEndingEmail(`expired`, items, `a`, end, NOW, 0, urls)).toMatchObject({
      template: `bonus_last_chance_earning`,
      vars: { current: `3`, deadline: `Dec 10, 2026` },
    })
  })
  it('excluded accounts: nothing', () => {
    const items = [monthly(`a`, `2026-07-14T12:00:00Z`, `cancelled`, ends)]
    expect(loyaltyEndingEmail(`cancel`, items, `a`, ends, NOW, 250, urls)).toBeNull()
  })
})

describe('resume token', () => {
  const hs = (d: string, k: string) => `h(${d}|${k})`
  it('round-trips and rejects tampering', () => {
    const t = resumeToken(hs, `s`, `123`)
    expect(parseResumeToken(hs, `s`, t)).toBe(`123`)
    expect(parseResumeToken(hs, `s`, t.replace(`123`, `124`))).toBeUndefined()
    expect(parseResumeToken(hs, ``, t)).toBeUndefined()
  })
})
