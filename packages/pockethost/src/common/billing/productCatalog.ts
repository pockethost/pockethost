import { SubscriptionInterval, SubscriptionType } from '../schema/User'
import type { ProductSku } from './types'

/**
 * Internal product catalog. Maps a stable, provider-agnostic SKU to the entitlement it grants. JSVM-safe: plain data +
 * sync functions only.
 *
 * Legacy `subscription` enum values are written alongside the SKU during the dual-write transition so existing code
 * paths keep working.
 */
export type EntitlementTemplate = {
  /** Legacy enum still written to `users.subscription` for back-compat. */
  legacySubscription: SubscriptionType
  interval: SubscriptionInterval | ''
  /** Slot count comes from checkout quantity when true. */
  quantityFromCheckout: boolean
  /** Used when `quantityFromCheckout` is false. */
  fixedQuantity?: number
  statusWhenActive: 'active' | 'grandfathered'
  /** Only recurring month/year are cancelable in-app. */
  cancelable: boolean
}

export const PRODUCT_CATALOG: Record<ProductSku, EntitlementTemplate> = {
  'hosting.slot.recurring.month.legacy': {
    legacySubscription: SubscriptionType.Premium,
    interval: SubscriptionInterval.Month,
    quantityFromCheckout: true,
    statusWhenActive: 'active',
    cancelable: true,
  },
  'hosting.slot.recurring.month': {
    legacySubscription: SubscriptionType.Premium,
    interval: SubscriptionInterval.Month,
    quantityFromCheckout: true,
    statusWhenActive: 'active',
    cancelable: true,
  },
  'hosting.slot.recurring.year': {
    legacySubscription: SubscriptionType.Premium,
    interval: SubscriptionInterval.Year,
    quantityFromCheckout: true,
    statusWhenActive: 'active',
    cancelable: true,
  },
  'hosting.slot.lifetime.legacy_flounder': {
    legacySubscription: SubscriptionType.Flounder,
    interval: SubscriptionInterval.Life,
    quantityFromCheckout: false,
    fixedQuantity: 250,
    statusWhenActive: 'active',
    cancelable: false,
  },
  'hosting.slot.lifetime': {
    legacySubscription: SubscriptionType.Flounder,
    interval: SubscriptionInterval.Life,
    quantityFromCheckout: true,
    statusWhenActive: 'active',
    cancelable: false,
  },
  'hosting.legacy.founder': {
    legacySubscription: SubscriptionType.Founder,
    interval: '',
    quantityFromCheckout: false,
    statusWhenActive: 'grandfathered',
    cancelable: false,
  },
  'hosting.legacy.legacy': {
    legacySubscription: SubscriptionType.Legacy,
    interval: '',
    quantityFromCheckout: false,
    statusWhenActive: 'grandfathered',
    cancelable: false,
  },
  'hosting.grandfathered.hacker': {
    legacySubscription: SubscriptionType.Free,
    interval: '',
    quantityFromCheckout: false,
    fixedQuantity: 1,
    statusWhenActive: 'grandfathered',
    cancelable: false,
  },
}

export const isKnownSku = (sku: string): sku is ProductSku => Object.prototype.hasOwnProperty.call(PRODUCT_CATALOG, sku)
