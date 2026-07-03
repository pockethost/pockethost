import { describe, expect, it } from 'vitest'
import {
  FLOUNDER_LIFETIME_LEGACY_PV_ID,
  INSTANCE_ANNUAL_PV_ID,
  INSTANCE_LIFETIME_PV_ID,
  INSTANCE_MONTHLY_LEGACY_PV_ID,
  INSTANCE_MONTHLY_PV_ID,
} from '../lemonSqueezy'
import { entitlementFromPvId } from './entitlementFromPvId'
import { resolveProviderSku } from './providerMappings'
import { resolveUserEntitlements, skuFromLegacy } from './resolveUserEntitlements'

describe('providerMappings', () => {
  it('maps live LS pv_ids to SKUs', () => {
    expect(resolveProviderSku('lemonsqueezy', INSTANCE_MONTHLY_PV_ID)).toBe('hosting.slot.recurring.month')
    expect(resolveProviderSku('lemonsqueezy', INSTANCE_ANNUAL_PV_ID)).toBe('hosting.slot.recurring.year')
    expect(resolveProviderSku('lemonsqueezy', INSTANCE_LIFETIME_PV_ID)).toBe('hosting.slot.lifetime')
    expect(resolveProviderSku('lemonsqueezy', INSTANCE_MONTHLY_LEGACY_PV_ID)).toBe(
      'hosting.slot.recurring.month.legacy'
    )
    expect(resolveProviderSku('lemonsqueezy', FLOUNDER_LIFETIME_LEGACY_PV_ID)).toBe(
      'hosting.slot.lifetime.legacy_flounder'
    )
  })

  it('returns undefined for unknown pv_id', () => {
    expect(resolveProviderSku('lemonsqueezy', '0-0')).toBeUndefined()
  })
})

describe('entitlementFromPvId', () => {
  it('monthly slot takes quantity from checkout', () => {
    expect(entitlementFromPvId(INSTANCE_MONTHLY_PV_ID, 3)).toEqual({
      product_sku: 'hosting.slot.recurring.month',
      subscription: 'premium',
      subscription_interval: 'month',
      subscription_quantity: 3,
      subscription_status: 'active',
    })
  })

  it('annual slot takes quantity from checkout', () => {
    expect(entitlementFromPvId(INSTANCE_ANNUAL_PV_ID, 2)).toEqual({
      product_sku: 'hosting.slot.recurring.year',
      subscription: 'premium',
      subscription_interval: 'year',
      subscription_quantity: 2,
      subscription_status: 'active',
    })
  })

  it('lifetime slot takes quantity from checkout', () => {
    expect(entitlementFromPvId(INSTANCE_LIFETIME_PV_ID, 2)).toEqual({
      product_sku: 'hosting.slot.lifetime',
      subscription: 'flounder',
      subscription_interval: 'life',
      subscription_quantity: 2,
      subscription_status: 'active',
    })
  })

  it('legacy flounder lifetime uses fixed quantity regardless of checkout', () => {
    expect(entitlementFromPvId(FLOUNDER_LIFETIME_LEGACY_PV_ID, 99)).toEqual({
      product_sku: 'hosting.slot.lifetime.legacy_flounder',
      subscription: 'flounder',
      subscription_interval: 'life',
      subscription_quantity: 250,
      subscription_status: 'active',
    })
  })

  it('returns undefined for unmapped pv_id', () => {
    expect(entitlementFromPvId('0-0', 1)).toBeUndefined()
  })
})

describe('skuFromLegacy', () => {
  it('classifies free with a slot as grandfathered hacker', () => {
    expect(skuFromLegacy('free', '', 1)).toBe('hosting.grandfathered.hacker')
  })

  it('classifies lapsed free (no slot) as empty', () => {
    expect(skuFromLegacy('free', '', 0)).toBe('')
  })

  it('classifies premium by interval', () => {
    expect(skuFromLegacy('premium', 'month', 1)).toBe('hosting.slot.recurring.month.legacy')
    expect(skuFromLegacy('premium', 'year', 1)).toBe('hosting.slot.recurring.year')
  })
})

describe('resolveUserEntitlements', () => {
  it('prefers a stored product_sku over legacy inference', () => {
    const r = resolveUserEntitlements({
      subscription: 'free',
      subscription_quantity: 1,
      product_sku: 'hosting.grandfathered.hacker',
      subscription_status: 'grandfathered',
    })
    expect(r.sku).toBe('hosting.grandfathered.hacker')
    expect(r.isGrandfathered).toBe(true)
    expect(r.hasSubscriberFeatures).toBe(true)
    expect(r.isPaidSubscriber).toBe(false)
    expect(r.displayPlanName).toBe('Hacker')
  })

  it('falls back to legacy fields when product_sku is empty', () => {
    const r = resolveUserEntitlements({
      subscription: 'premium',
      subscription_interval: 'month',
      subscription_quantity: 2,
    })
    expect(r.sku).toBe('hosting.slot.recurring.month.legacy')
    expect(r.status).toBe('active')
    expect(r.isPaidSubscriber).toBe(true)
    expect(r.isCancelableMonthly).toBe(true)
    expect(r.slotCount).toBe(2)
  })

  it('treats free with no slot as lapsed without hosting', () => {
    const r = resolveUserEntitlements({ subscription: 'free', subscription_quantity: 0 })
    expect(r.status).toBe('lapsed')
    expect(r.hasHostingAccess).toBe(false)
    expect(r.hasSubscriberFeatures).toBe(false)
  })
})
