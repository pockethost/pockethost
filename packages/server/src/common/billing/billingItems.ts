import { SubscriptionInterval, SubscriptionType } from '../schema/User'
import { entitlementFromPvId, type AppliedEntitlement } from './entitlementFromPvId'
import { isKnownSku, PRODUCT_CATALOG } from './productCatalog'
import { resolveUserEntitlements, type EntitlementInput } from './resolveUserEntitlements'
import type { ProductSku } from './types'

/**
 * One purchase that grants hosting slots. A user can hold any number of these at once (e.g. two monthly Lemon Squeezy
 * subscriptions because PayPal subscriptions cannot change quantity, plus a lifetime order). The user's entitlement is
 * always recomputed from the full set — never incremented/decremented in place.
 *
 * JSVM-safe: plain data + sync functions only.
 */
export type BillingItemKind = 'subscription' | 'order' | 'manual'
export type BillingItemProvider = 'lemonsqueezy' | 'manual'

export type BillingItem = {
  provider: BillingItemProvider
  kind: BillingItemKind
  /** LS subscription id / LS order id / free-form id for manual grants. */
  external_id: string
  sku: ProductSku
  quantity: number
  /** Provider status verbatim (LS subscription or order status), or `active` / `inactive` for manual rows. */
  status: string
  /** ISO date. For cancelled subscriptions, access ends here. */
  ends_at?: string
  renews_at?: string
  variant_id?: string
  product_name?: string
  variant_name?: string
}

/** LS subscription statuses that still grant access. `cancelled` = cancelled but paid through `ends_at`. */
const ACTIVE_SUBSCRIPTION_STATUSES = ['on_trial', 'active', 'past_due', 'cancelled']

/** LS order statuses that still grant access (lifetime purchases). */
const ACTIVE_ORDER_STATUSES = ['paid', 'partial_refund']

export const isBillingItemActive = (item: Pick<BillingItem, 'kind' | 'status' | 'ends_at'>, now: Date): boolean => {
  switch (item.kind) {
    case 'subscription': {
      if (!ACTIVE_SUBSCRIPTION_STATUSES.includes(item.status)) return false
      if (item.status === 'cancelled' && item.ends_at) {
        const ends = new Date(item.ends_at)
        if (!isNaN(ends.getTime()) && ends.getTime() <= now.getTime()) return false
      }
      return true
    }
    case 'order':
      return ACTIVE_ORDER_STATUSES.includes(item.status)
    case 'manual': {
      // Manual rows can carry a scheduled end (e.g. a preserve top-up being released after a grace period).
      if (item.status !== 'active') return false
      if (item.ends_at) {
        const ends = new Date(item.ends_at)
        if (!isNaN(ends.getTime()) && ends.getTime() <= now.getTime()) return false
      }
      return true
    }
    default:
      return false
  }
}

/**
 * When a user holds several SKUs, this decides which one drives the legacy `subscription` / `subscription_interval`
 * fields (plan label, cancel button). Recurring monthly first so the in-app cancel flow stays reachable.
 */
const SKU_PRIORITY: ProductSku[] = [
  'hosting.slot.recurring.month',
  'hosting.slot.recurring.month.legacy',
  'hosting.slot.recurring.year',
  'hosting.legacy.unlimited.month',
  'hosting.legacy.unlimited.year',
  'hosting.legacy.founder.year',
  'hosting.legacy.flounder.year',
  'hosting.slot.lifetime',
  'hosting.slot.lifetime.legacy_flounder',
  'hosting.legacy.founder',
  'hosting.legacy.legacy',
  'hosting.grandfathered.hacker',
]

/**
 * Legacy "unlimited" accounts store int32 max as their slot count. Totals are capped there so stacking another purchase
 * on top neither overflows nor changes anything.
 */
export const UNLIMITED_SLOTS = 2147483647

export const LAPSED_ENTITLEMENT = {
  product_sku: '',
  subscription: SubscriptionType.Free,
  subscription_interval: '',
  subscription_quantity: 0,
  subscription_status: 'lapsed',
} as const

export type ReconciledEntitlement = AppliedEntitlement | typeof LAPSED_ENTITLEMENT

/** Sum every active item into the fields written to the `users` record. */
export const reconcileEntitlement = (items: BillingItem[], now: Date): ReconciledEntitlement => {
  const active = items.filter((i) => isBillingItemActive(i, now) && isKnownSku(i.sku) && i.quantity > 0)
  if (active.length === 0) return LAPSED_ENTITLEMENT

  const primary = [...active].sort((a, b) => SKU_PRIORITY.indexOf(a.sku) - SKU_PRIORITY.indexOf(b.sku))[0]!
  const template = PRODUCT_CATALOG[primary.sku]
  const quantity = Math.min(
    active.reduce((sum, i) => sum + i.quantity, 0),
    UNLIMITED_SLOTS
  )
  const anyPaid = active.some((i) => PRODUCT_CATALOG[i.sku].statusWhenActive === 'active')

  return {
    product_sku: primary.sku,
    subscription: template.legacySubscription,
    subscription_interval: template.interval,
    subscription_quantity: quantity,
    subscription_status: anyPaid ? 'active' : 'grandfathered',
  }
}

/** SKUs that never come from Lemon Squeezy, so a fresh LS sync cannot rediscover them. */
const NON_LS_SKUS: ProductSku[] = ['hosting.legacy.founder', 'hosting.legacy.legacy', 'hosting.grandfathered.hacker']

/**
 * Pre-`billing_items` accounts on a non-LS plan (founder / legacy / grandfathered hacker) keep that entitlement as a
 * manual row so a later LS purchase adds to it instead of replacing it.
 */
export const baselineExternalId = (userId: string) => `baseline:${userId}`

/** True for a manual baseline row (current per-user key, or the buggy pre-fix per-SKU key). */
export const isBaselineExternalId = (externalId: string) => externalId.startsWith('baseline:')

export const baselineItemFromUser = (user: EntitlementInput, userId: string): BillingItem | undefined => {
  const resolved = resolveUserEntitlements(user)
  if (!resolved.sku || !NON_LS_SKUS.includes(resolved.sku) || resolved.slotCount <= 0) return undefined
  return {
    provider: 'manual',
    kind: 'manual',
    // Must be unique per user: (provider, kind, external_id) is a unique index.
    external_id: baselineExternalId(userId),
    sku: resolved.sku,
    quantity: resolved.slotCount,
    status: 'active',
  }
}

const pvIdOf = (attrs: { product_id?: unknown; variant_id?: unknown }) =>
  `${attrs.product_id ?? ''}-${attrs.variant_id ?? ''}`

const isRecurringSku = (sku: ProductSku) => {
  const interval = PRODUCT_CATALOG[sku].interval
  return interval === SubscriptionInterval.Month || interval === SubscriptionInterval.Year
}

/** Minimal LS subscription resource (`data` of a `subscriptions` webhook or API response). */
export type LsSubscriptionResource = {
  id: string | number
  attributes?: {
    product_id?: number
    variant_id?: number
    product_name?: string
    variant_name?: string
    status?: string
    ends_at?: string | null
    renews_at?: string | null
    first_subscription_item?: { quantity?: number } | null
  }
}

/** Minimal LS order resource. */
export type LsOrderResource = {
  id: string | number
  attributes?: {
    status?: string
    first_order_item?: {
      product_id?: number
      variant_id?: number
      product_name?: string
      variant_name?: string
      quantity?: number
    } | null
  }
}

/** Map an LS subscription to a billing item. Undefined for unmapped variants. */
/**
 * Whether an LS subscription resource carries its product and variant. During checkout LS sends an early
 * `subscription_updated` for the new subscription with product, variant and order still null; the full subscription
 * must be fetched (or the event skipped) instead of treating it as an unknown variant.
 */
export const isCompleteLsSubscription = (sub: LsSubscriptionResource | undefined): boolean =>
  !!sub && !!sub.attributes?.product_id && !!sub.attributes?.variant_id

/** LS dispute events (chargebacks): alerted, not applied to billing. */
export const isLsDisputeEvent = (eventName: string | undefined) => !!eventName && eventName.startsWith('dispute_')

/** One-line Discord summary of an LS dispute event, from whatever fields the payload carries. */
export const lsDisputeSummary = (
  eventName: string,
  data: { id?: string | number; attributes?: Record<string, any> } | undefined
) => {
  const a = data?.attributes || {}
  const amount =
    typeof a.amount === 'number'
      ? `${(a.amount / 100).toFixed(2)} ${`${a.currency || ''}`.toUpperCase()}`.trim()
      : a.amount_formatted || ''
  const parts = [
    `Lemon Squeezy ${eventName.replace('_', ' ')}`,
    data?.id !== undefined ? `#${data.id}` : '',
    a.order_id ? `order ${a.order_id}` : '',
    amount,
    a.status ? `status ${a.status}` : '',
    a.reason ? `reason: ${a.reason}` : '',
    a.user_email ? `(${a.user_email})` : '',
  ]
  return parts.filter(Boolean).join(' · ')
}

export const billingItemFromLsSubscription = (sub: LsSubscriptionResource): BillingItem | undefined => {
  const attrs = sub.attributes || {}
  const pvId = pvIdOf(attrs)
  const entitlement = entitlementFromPvId(pvId, attrs.first_subscription_item?.quantity || 1)
  if (!entitlement) return undefined
  return {
    provider: 'lemonsqueezy',
    kind: 'subscription',
    external_id: `${sub.id}`,
    sku: entitlement.product_sku,
    quantity: entitlement.subscription_quantity,
    status: `${attrs.status || ''}`,
    ends_at: attrs.ends_at || undefined,
    renews_at: attrs.renews_at || undefined,
    variant_id: `${attrs.variant_id ?? ''}`,
    product_name: attrs.product_name || '',
    variant_name: attrs.variant_name || '',
  }
}

/**
 * Map an LS order to a billing item. Only one-time (lifetime) purchases become order items — recurring orders are
 * represented by their subscription. Undefined for recurring or unmapped variants.
 */
export const billingItemFromLsOrder = (order: LsOrderResource): BillingItem | undefined => {
  const item = order.attributes?.first_order_item
  if (!item) return undefined
  const entitlement = entitlementFromPvId(pvIdOf(item), item.quantity || 1)
  if (!entitlement || isRecurringSku(entitlement.product_sku)) return undefined
  return {
    provider: 'lemonsqueezy',
    kind: 'order',
    external_id: `${order.id}`,
    sku: entitlement.product_sku,
    quantity: entitlement.subscription_quantity,
    status: `${order.attributes?.status || ''}`,
    variant_id: `${item.variant_id ?? ''}`,
    product_name: item.product_name || '',
    variant_name: item.variant_name || '',
  }
}

/** True when an LS order's product is a recurring plan (its slots live on the subscription, not the order). */
export const isRecurringLsOrder = (order: LsOrderResource): boolean => {
  const item = order.attributes?.first_order_item
  if (!item) return false
  const entitlement = entitlementFromPvId(pvIdOf(item), 1)
  return !!entitlement && isRecurringSku(entitlement.product_sku)
}
