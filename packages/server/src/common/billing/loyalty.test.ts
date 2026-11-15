import { describe, expect, it } from 'vitest'
import type { BillingItem } from './billingItems'
import { bonusForRenewals, isPaidRenewalInvoice, loyaltyBonus, loyaltyNote, nextBonusAtRenewal } from './loyalty'

const NOW = new Date(`2026-11-11T12:00:00Z`)

const sub = (id: string, sku: BillingItem['sku'], status = `active`, ends_at?: string): BillingItem => ({
  provider: `lemonsqueezy`,
  kind: `subscription`,
  external_id: id,
  sku,
  quantity: 1,
  status,
  ends_at,
})
const monthly = (id: string, status?: string, ends_at?: string) =>
  sub(id, `hosting.slot.recurring.month`, status, ends_at)

describe('bonusForRenewals', () => {
  it('follows 1, 4, 7, 10, 13 and caps at 5', () => {
    const got = [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 12, 13, 40].map(bonusForRenewals)
    expect(got).toEqual([0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 5])
  })
  it('treats junk as 0', () => {
    expect(bonusForRenewals(-3)).toBe(0)
    expect(bonusForRenewals(NaN)).toBe(0)
  })
  it('names the next renewal that earns', () => {
    expect([0, 1, 3, 4, 12, 13].map(nextBonusAtRenewal)).toEqual([1, 4, 4, 7, 13, null])
  })
})

describe('loyaltyBonus', () => {
  it('gives lifetime 5 up front', () => {
    const items: BillingItem[] = [
      {
        provider: `lemonsqueezy`,
        kind: `order`,
        external_id: `o1`,
        sku: `hosting.slot.lifetime`,
        quantity: 1,
        status: `paid`,
      },
    ]
    expect(loyaltyBonus(items, {}, NOW)).toMatchObject({ bonus: 5, basis: `upfront` })
  })

  it('gives legacy Flounder lifetime nothing', () => {
    const items: BillingItem[] = [
      {
        provider: `lemonsqueezy`,
        kind: `order`,
        external_id: `o1`,
        sku: `hosting.slot.lifetime.legacy_flounder`,
        quantity: 250,
        status: `paid`,
      },
    ]
    expect(loyaltyBonus(items, {}, NOW).bonus).toBe(0)
  })

  it('gives annual 5 while active, including cancelled within its period', () => {
    expect(loyaltyBonus([sub(`a`, `hosting.slot.recurring.year`)], {}, NOW).bonus).toBe(5)
    const cancelled = sub(`a`, `hosting.slot.recurring.year`, `cancelled`, `2027-01-01T00:00:00Z`)
    expect(loyaltyBonus([cancelled], {}, NOW).bonus).toBe(5)
    const ended = sub(`a`, `hosting.slot.recurring.year`, `cancelled`, `2026-11-01T00:00:00Z`)
    expect(loyaltyBonus([ended], {}, NOW).bonus).toBe(0)
    expect(loyaltyBonus([sub(`a`, `hosting.slot.recurring.year`, `expired`)], {}, NOW).bonus).toBe(0)
  })

  it('counts paid renewals on active monthly subscriptions', () => {
    expect(loyaltyBonus([monthly(`m`)], {}, NOW)).toMatchObject({ bonus: 0, basis: `none`, renewals: 0 })
    expect(loyaltyBonus([monthly(`m`)], { m: 1 }, NOW)).toMatchObject({ bonus: 1, basis: `renewals`, renewals: 1 })
    expect(loyaltyBonus([monthly(`m`)], { m: 7 }, NOW).bonus).toBe(3)
  })

  it('sums renewals across several active monthly subscriptions', () => {
    const r = loyaltyBonus([monthly(`m1`), monthly(`m2`)], { m1: 2, m2: 2 }, NOW)
    expect(r).toMatchObject({ bonus: 2, renewals: 4, monthlySubscriptionIds: [`m1`, `m2`] })
  })

  it('keeps the bonus after cancel until the paid period ends', () => {
    const cancelled = monthly(`m`, `cancelled`, `2026-12-01T00:00:00Z`)
    expect(loyaltyBonus([cancelled], { m: 4 }, NOW).bonus).toBe(2)
    const ended = monthly(`m`, `cancelled`, `2026-11-10T00:00:00Z`)
    expect(loyaltyBonus([ended], { m: 4 }, NOW).bonus).toBe(0)
  })

  it('drops renewals of expired subscriptions (a new subscription starts from 0)', () => {
    expect(loyaltyBonus([monthly(`old`, `expired`), monthly(`new`)], { old: 9, new: 0 }, NOW).bonus).toBe(0)
  })

  it('jumps to 5 when an annual plan is added next to a monthly one', () => {
    const r = loyaltyBonus([monthly(`m`), sub(`a`, `hosting.slot.recurring.year`)], { m: 1 }, NOW)
    expect(r).toMatchObject({ bonus: 5, basis: `upfront` })
  })

  it('ignores manual and baseline rows', () => {
    const manual: BillingItem = {
      provider: `manual`,
      kind: `manual`,
      external_id: `baseline:u`,
      sku: `hosting.slot.recurring.year`,
      quantity: 1,
      status: `active`,
    }
    expect(loyaltyBonus([manual], {}, NOW).bonus).toBe(0)
  })

  it('writes a customer-facing note', () => {
    expect(loyaltyNote(loyaltyBonus([monthly(`m`)], { m: 1 }, NOW))).toBe(`Loyalty bonus: 1 monthly renewal`)
    expect(loyaltyNote(loyaltyBonus([sub(`a`, `hosting.slot.recurring.year`)], {}, NOW))).toBe(
      `Loyalty bonus: 5 instances with your annual or lifetime plan`
    )
  })
})

describe('isPaidRenewalInvoice', () => {
  it('counts paid renewals only', () => {
    expect(isPaidRenewalInvoice({ billing_reason: `renewal`, status: `paid` })).toBe(true)
    expect(isPaidRenewalInvoice({ billing_reason: `initial`, status: `paid` })).toBe(false)
    expect(isPaidRenewalInvoice({ billing_reason: `renewal`, status: `pending` })).toBe(false)
    expect(isPaidRenewalInvoice({ billing_reason: `renewal`, status: `paid`, refunded: true })).toBe(false)
    expect(isPaidRenewalInvoice({ billing_reason: `renewal`, status: `refunded` })).toBe(false)
  })
})
