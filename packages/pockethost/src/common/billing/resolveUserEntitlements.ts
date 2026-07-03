import { PLAN_NAMES, SubscriptionInterval, SubscriptionType } from '../schema/User'
import { isKnownSku, PRODUCT_CATALOG } from './productCatalog'
import type { ProductSku, SubscriptionStatus } from './types'

/** Minimal user shape the resolver needs. Compatible with `UserFields`. */
export type EntitlementInput = {
  subscription?: SubscriptionType | string
  subscription_interval?: SubscriptionInterval | string
  subscription_quantity?: number
  product_sku?: ProductSku | string
  subscription_status?: SubscriptionStatus | string
}

export type ResolvedEntitlements = {
  sku: ProductSku | ''
  status: SubscriptionStatus
  slotCount: number
  interval: SubscriptionInterval | ''
  /** Can run at least one instance. */
  hasHostingAccess: boolean
  /** Paid or grandfathered hosting → subscriber-only features (custom domains, trusted IPs). */
  hasSubscriberFeatures: boolean
  /** Lemon Squeezy-backed paid subscriber. Excludes grandfathered cohorts. */
  isPaidSubscriber: boolean
  /** Grandfathered pre-paywall hacker specifically. */
  isGrandfathered: boolean
  isCancelableMonthly: boolean
  /** Customer-facing label from PLAN_NAMES. */
  displayPlanName: string
}

/**
 * Infer the SKU from legacy fields. Single source of truth for both the read fallback (here) and the backfill migration
 * (Deploy 2).
 */
export const skuFromLegacy = (
  subscription: string | undefined,
  interval: string | undefined,
  quantity: number
): ProductSku | '' => {
  switch (subscription) {
    case SubscriptionType.Premium:
      if (interval === SubscriptionInterval.Year) return 'hosting.slot.recurring.year'
      if (interval === SubscriptionInterval.Life) return 'hosting.slot.lifetime'
      return 'hosting.slot.recurring.month.legacy'
    case SubscriptionType.Flounder:
      return 'hosting.slot.lifetime.legacy_flounder'
    case SubscriptionType.Founder:
      return 'hosting.legacy.founder'
    case SubscriptionType.Legacy:
      return 'hosting.legacy.legacy'
    case SubscriptionType.Free:
      return quantity > 0 ? 'hosting.grandfathered.hacker' : ''
    default:
      return ''
  }
}

export const resolveUserEntitlements = (user: EntitlementInput): ResolvedEntitlements => {
  const legacySubscription = `${user.subscription ?? ''}` as SubscriptionType
  const interval = `${user.subscription_interval ?? ''}` as SubscriptionInterval | ''
  const slotCount = user.subscription_quantity ?? 0

  const storedSku = user.product_sku
  const sku: ProductSku | '' =
    storedSku && isKnownSku(storedSku)
      ? storedSku
      : skuFromLegacy(user.subscription, user.subscription_interval, slotCount)

  const template = sku ? PRODUCT_CATALOG[sku] : undefined

  const status: SubscriptionStatus = (() => {
    if (
      user.subscription_status === 'active' ||
      user.subscription_status === 'lapsed' ||
      user.subscription_status === 'grandfathered'
    ) {
      return user.subscription_status
    }
    if (template) return template.statusWhenActive === 'grandfathered' ? 'grandfathered' : 'active'
    return 'lapsed'
  })()

  const hasHostingAccess = slotCount > 0
  const isGrandfathered = sku === 'hosting.grandfathered.hacker'
  const isPaidSubscriber = status === 'active' && legacySubscription === SubscriptionType.Premium
  const isCancelableMonthly =
    !!template && template.cancelable && interval === SubscriptionInterval.Month && hasHostingAccess

  return {
    sku,
    status,
    slotCount,
    interval,
    hasHostingAccess,
    hasSubscriberFeatures: hasHostingAccess,
    isPaidSubscriber,
    isGrandfathered,
    isCancelableMonthly,
    displayPlanName: PLAN_NAMES[legacySubscription] ?? PLAN_NAMES[SubscriptionType.Free],
  }
}
