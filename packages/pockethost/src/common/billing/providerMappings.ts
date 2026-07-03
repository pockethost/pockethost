import {
  FLOUNDER_LIFETIME_LEGACY_PV_ID,
  INSTANCE_ANNUAL_PV_ID,
  INSTANCE_LIFETIME_PV_ID,
  INSTANCE_MONTHLY_LEGACY_PV_ID,
  INSTANCE_MONTHLY_PV_ID,
} from '../lemonSqueezy'
import type { BillingProvider, ProductSku } from './types'

/**
 * Maps an external provider entity to an internal SKU. The key is `{provider}:{externalId}` where `externalId` is the
 * Lemon Squeezy `{product_id}-{variant_id}` pv_id.
 */
const SKU_BY_PROVIDER_KEY: Record<string, ProductSku> = {
  [`lemonsqueezy:${INSTANCE_MONTHLY_PV_ID}`]: 'hosting.slot.recurring.month',
  [`lemonsqueezy:${INSTANCE_ANNUAL_PV_ID}`]: 'hosting.slot.recurring.year',
  [`lemonsqueezy:${INSTANCE_LIFETIME_PV_ID}`]: 'hosting.slot.lifetime',
  [`lemonsqueezy:${INSTANCE_MONTHLY_LEGACY_PV_ID}`]: 'hosting.slot.recurring.month.legacy',
  [`lemonsqueezy:${FLOUNDER_LIFETIME_LEGACY_PV_ID}`]: 'hosting.slot.lifetime.legacy_flounder',
}

export const providerKey = (provider: BillingProvider, externalId: string) => `${provider}:${externalId}`

export const resolveProviderSku = (provider: BillingProvider, externalId: string): ProductSku | undefined =>
  SKU_BY_PROVIDER_KEY[providerKey(provider, externalId)]
