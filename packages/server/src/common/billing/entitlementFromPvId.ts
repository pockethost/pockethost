import { SubscriptionInterval, SubscriptionType } from '../schema/User'
import { PRODUCT_CATALOG } from './productCatalog'
import { resolveProviderSku } from './providerMappings'
import type { ProductSku } from './types'

/**
 * Fields a billing event should write to a `users` record. Includes legacy enum fields (dual-write back-compat) plus
 * the new SKU + status.
 */
export type AppliedEntitlement = {
  product_sku: ProductSku
  subscription: SubscriptionType
  subscription_interval: SubscriptionInterval | ''
  subscription_quantity: number
  subscription_status: 'active' | 'grandfathered'
}

/**
 * Resolve a Lemon Squeezy pv_id (`{product_id}-{variant_id}`) + checkout quantity into the entitlement to apply.
 * Returns undefined for unmapped pv_ids so callers can reject unknown products.
 */
export const entitlementFromPvId = (pvId: string, quantity: number): AppliedEntitlement | undefined => {
  const sku = resolveProviderSku('lemonsqueezy', pvId)
  if (!sku) return undefined

  const template = PRODUCT_CATALOG[sku]
  const resolvedQuantity = template.quantityFromCheckout ? quantity : (template.fixedQuantity ?? 0)

  return {
    product_sku: sku,
    subscription: template.legacySubscription,
    subscription_interval: template.interval,
    subscription_quantity: resolvedQuantity,
    subscription_status: template.statusWhenActive,
  }
}
