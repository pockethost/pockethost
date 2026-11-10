import { describe, expect, it } from 'vitest'
import {
  FLOUNDER_LIFETIME_LEGACY_PV_ID,
  INSTANCE_ANNUAL_PV_ID,
  INSTANCE_LIFETIME_PV_ID,
  INSTANCE_MONTHLY_PV_ID,
} from '../lemonSqueezy'
import {
  isCompleteLsSubscription,
  isLsDisputeEvent,
  lsDisputeSummary,
  baselineItemFromUser,
  billingItemFromLsOrder,
  billingItemFromLsSubscription,
  isBillingItemActive,
  isRecurringLsOrder,
  LAPSED_ENTITLEMENT,
  reconcileEntitlement,
  type BillingItem,
} from './billingItems'

const now = new Date('2026-11-06T12:00:00Z')

const [monthlyProduct, monthlyVariant] = INSTANCE_MONTHLY_PV_ID.split('-').map(Number)
const [annualProduct, annualVariant] = INSTANCE_ANNUAL_PV_ID.split('-').map(Number)
const [lifetimeProduct, lifetimeVariant] = INSTANCE_LIFETIME_PV_ID.split('-').map(Number)
const [flounderProduct, flounderVariant] = FLOUNDER_LIFETIME_LEGACY_PV_ID.split('-').map(Number)

const monthlySub = (id: string, quantity: number, status = 'active', ends_at?: string): BillingItem => ({
  provider: 'lemonsqueezy',
  kind: 'subscription',
  external_id: id,
  sku: 'hosting.slot.recurring.month',
  quantity,
  status,
  ends_at,
})

describe('isBillingItemActive', () => {
  it('counts active, trial, past_due subscriptions', () => {
    for (const status of ['active', 'on_trial', 'past_due']) {
      expect(isBillingItemActive({ kind: 'subscription', status }, now)).toBe(true)
    }
  })

  it('counts cancelled subscriptions until ends_at', () => {
    expect(
      isBillingItemActive({ kind: 'subscription', status: 'cancelled', ends_at: '2026-12-01T00:00:00Z' }, now)
    ).toBe(true)
    expect(
      isBillingItemActive({ kind: 'subscription', status: 'cancelled', ends_at: '2026-11-01T00:00:00Z' }, now)
    ).toBe(false)
  })

  it('drops expired / unpaid / paused subscriptions', () => {
    for (const status of ['expired', 'unpaid', 'paused']) {
      expect(isBillingItemActive({ kind: 'subscription', status }, now)).toBe(false)
    }
  })

  it('counts manual rows until their scheduled end', () => {
    expect(isBillingItemActive({ kind: 'manual', status: 'active' }, now)).toBe(true)
    expect(isBillingItemActive({ kind: 'manual', status: 'active', ends_at: '2026-11-20T00:00:00Z' }, now)).toBe(true)
    expect(isBillingItemActive({ kind: 'manual', status: 'active', ends_at: '2026-11-01T00:00:00Z' }, now)).toBe(false)
    expect(isBillingItemActive({ kind: 'manual', status: 'inactive' }, now)).toBe(false)
  })

  it('counts paid orders, not refunded ones', () => {
    expect(isBillingItemActive({ kind: 'order', status: 'paid' }, now)).toBe(true)
    expect(isBillingItemActive({ kind: 'order', status: 'refunded' }, now)).toBe(false)
  })
})

describe('reconcileEntitlement', () => {
  it('sums duplicate subscriptions instead of overwriting', () => {
    const r = reconcileEntitlement([monthlySub('a', 3), monthlySub('b', 2)], now)
    expect(r.subscription_quantity).toBe(5)
    expect(r.subscription).toBe('premium')
    expect(r.subscription_interval).toBe('month')
  })

  it('expiring one of two subscriptions only removes its own slots', () => {
    const r = reconcileEntitlement([monthlySub('a', 3, 'expired'), monthlySub('b', 2)], now)
    expect(r.subscription_quantity).toBe(2)
  })

  it('lifetime + monthly add up, and monthly drives the plan fields (cancel stays reachable)', () => {
    const lifetime: BillingItem = {
      provider: 'lemonsqueezy',
      kind: 'order',
      external_id: 'o1',
      sku: 'hosting.slot.lifetime',
      quantity: 2,
      status: 'paid',
    }
    const r = reconcileEntitlement([lifetime, monthlySub('a', 1)], now)
    expect(r).toEqual({
      product_sku: 'hosting.slot.recurring.month',
      subscription: 'premium',
      subscription_interval: 'month',
      subscription_quantity: 3,
      subscription_status: 'active',
    })

    // Monthly lapses → lifetime slots survive.
    const after = reconcileEntitlement([lifetime, monthlySub('a', 1, 'expired')], now)
    expect(after.subscription_quantity).toBe(2)
    expect(after.subscription).toBe('flounder')
    expect(after.subscription_interval).toBe('life')
  })

  it('caps at the legacy unlimited sentinel instead of overflowing', () => {
    const unlimited: BillingItem = {
      provider: 'manual',
      kind: 'manual',
      external_id: 'baseline:u1',
      sku: 'hosting.legacy.founder',
      quantity: 2147483647,
      status: 'active',
    }
    expect(reconcileEntitlement([unlimited, monthlySub('a', 250)], now).subscription_quantity).toBe(2147483647)
  })

  it('lapses when nothing is active', () => {
    expect(reconcileEntitlement([monthlySub('a', 3, 'expired')], now)).toEqual(LAPSED_ENTITLEMENT)
    expect(reconcileEntitlement([], now)).toEqual(LAPSED_ENTITLEMENT)
  })

  it('grandfathered baseline + paid slot is active', () => {
    const baseline = baselineItemFromUser({ subscription: 'free', subscription_quantity: 1 }, 'u1')!
    const r = reconcileEntitlement([baseline, monthlySub('a', 1)], now)
    expect(r.subscription_quantity).toBe(2)
    expect(r.subscription_status).toBe('active')
  })

  it('grandfathered baseline alone stays grandfathered', () => {
    const baseline = baselineItemFromUser({ subscription: 'free', subscription_quantity: 1 }, 'u1')!
    const r = reconcileEntitlement([baseline], now)
    expect(r.subscription_quantity).toBe(1)
    expect(r.subscription_status).toBe('grandfathered')
  })
})

describe('baselineItemFromUser', () => {
  it('keeps founder / grandfathered entitlements', () => {
    expect(baselineItemFromUser({ subscription: 'founder', subscription_quantity: 10 }, 'u1')).toMatchObject({
      kind: 'manual',
      sku: 'hosting.legacy.founder',
      quantity: 10,
    })
  })

  it('keys the row per user so two users never share one row', () => {
    const a = baselineItemFromUser({ subscription: 'free', subscription_quantity: 1 }, 'userA')!
    const b = baselineItemFromUser({ subscription: 'free', subscription_quantity: 1 }, 'userB')!
    expect(a.external_id).toBe('baseline:userA')
    expect(b.external_id).not.toBe(a.external_id)
  })

  it('ignores LS-backed plans and empty accounts', () => {
    expect(
      baselineItemFromUser({ subscription: 'premium', subscription_interval: 'month', subscription_quantity: 3 }, 'u1')
    ).toBeUndefined()
    expect(baselineItemFromUser({ subscription: 'free', subscription_quantity: 0 }, 'u1')).toBeUndefined()
  })
})

describe('LS resource mapping', () => {
  it('maps a subscription with quantity', () => {
    expect(
      billingItemFromLsSubscription({
        id: 123,
        attributes: {
          product_id: monthlyProduct,
          variant_id: monthlyVariant,
          status: 'active',
          renews_at: '2026-12-01T00:00:00Z',
          ends_at: null,
          first_subscription_item: { quantity: 4 },
        },
      })
    ).toMatchObject({ kind: 'subscription', external_id: '123', sku: 'hosting.slot.recurring.month', quantity: 4 })
  })

  it('maps annual subscriptions', () => {
    expect(
      billingItemFromLsSubscription({
        id: 1,
        attributes: { product_id: annualProduct, variant_id: annualVariant, status: 'active' },
      })?.sku
    ).toBe('hosting.slot.recurring.year')
  })

  it('returns undefined for unknown variants', () => {
    expect(billingItemFromLsSubscription({ id: 1, attributes: { product_id: 1, variant_id: 2 } })).toBeUndefined()
  })

  it('maps lifetime orders, skips recurring orders', () => {
    expect(
      billingItemFromLsOrder({
        id: 9,
        attributes: {
          status: 'paid',
          first_order_item: { product_id: lifetimeProduct, variant_id: lifetimeVariant, quantity: 2 },
        },
      })
    ).toMatchObject({ kind: 'order', sku: 'hosting.slot.lifetime', quantity: 2 })

    const recurring = {
      id: 10,
      attributes: {
        status: 'paid',
        first_order_item: { product_id: monthlyProduct, variant_id: monthlyVariant, quantity: 1 },
      },
    }
    expect(billingItemFromLsOrder(recurring)).toBeUndefined()
    expect(isRecurringLsOrder(recurring)).toBe(true)
  })

  it('legacy flounder order is fixed 250 slots', () => {
    expect(
      billingItemFromLsOrder({
        id: 11,
        attributes: {
          status: 'paid',
          first_order_item: { product_id: flounderProduct, variant_id: flounderVariant, quantity: 1 },
        },
      })?.quantity
    ).toBe(250)
  })
})

describe('retired LS variants', () => {
  const sub = (pv: string, status = 'active') => {
    const [product_id, variant_id] = pv.split('-').map(Number)
    return billingItemFromLsSubscription({
      id: 1,
      attributes: { product_id, variant_id, status, first_subscription_item: { quantity: 1 } },
    })
  }

  it('maps "idkfa" and the 2023 Pro / Founder / Flounder annual plans to 250 slots', () => {
    expect(sub('424532-651629')).toMatchObject({ sku: 'hosting.legacy.unlimited.month', quantity: 250 })
    expect(sub('424532-651634')).toMatchObject({ sku: 'hosting.legacy.unlimited.year', quantity: 250 })
    expect(sub('159790-200788')).toMatchObject({ sku: 'hosting.legacy.unlimited.month', quantity: 250 })
    expect(sub('159791-200789')).toMatchObject({ sku: 'hosting.legacy.unlimited.year', quantity: 250 })
    expect(sub('159792-200790')).toMatchObject({ sku: 'hosting.legacy.founder.year', quantity: 250 })
    expect(sub('367781-547858')).toMatchObject({ sku: 'hosting.legacy.flounder.year', quantity: 250 })
  })

  it('maps the 2023 Flounder lifetime order to the 250-slot legacy flounder', () => {
    expect(
      billingItemFromLsOrder({
        id: 7,
        attributes: { status: 'paid', first_order_item: { product_id: 306534, variant_id: 441845, quantity: 1 } },
      })
    ).toMatchObject({ kind: 'order', sku: 'hosting.slot.lifetime.legacy_flounder', quantity: 250 })
  })

  it('an expired legacy subscription grants nothing', () => {
    expect(reconcileEntitlement([sub('424532-651629', 'expired')!], now)).toEqual(LAPSED_ENTITLEMENT)
  })
})

describe('isCompleteLsSubscription', () => {
  it('rejects the early checkout subscription_updated with null product and variant', () => {
    expect(
      isCompleteLsSubscription({ id: 2673824, attributes: { product_id: null, variant_id: null, status: 'active' } as any })
    ).toBe(false)
    expect(isCompleteLsSubscription(undefined)).toBe(false)
  })
  it('accepts a subscription with product and variant', () => {
    expect(isCompleteLsSubscription({ id: 1, attributes: { product_id: 1192400, variant_id: 1864333 } })).toBe(true)
  })
})

describe('LS disputes', () => {
  it('recognises dispute events only', () => {
    expect(isLsDisputeEvent('dispute_created')).toBe(true)
    expect(isLsDisputeEvent('dispute_resolved')).toBe(true)
    expect(isLsDisputeEvent('subscription_updated')).toBe(false)
    expect(isLsDisputeEvent(undefined)).toBe(false)
  })
  it('summarises whatever the payload carries', () => {
    expect(
      lsDisputeSummary('dispute_created', {
        id: 42,
        attributes: { order_id: 9994001, amount: 999, currency: 'usd', status: 'needs_response', reason: 'fraudulent' },
      })
    ).toBe('Lemon Squeezy dispute created · #42 · order 9994001 · 9.99 USD · status needs_response · reason: fraudulent')
    expect(lsDisputeSummary('dispute_resolved', undefined)).toBe('Lemon Squeezy dispute resolved')
  })
})
