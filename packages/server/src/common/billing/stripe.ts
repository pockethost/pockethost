import type { BillingItem } from './billingItems'
import { entitlementFromSku } from './entitlementFromPvId'
import { isKnownSku } from './productCatalog'
import type { ProductSku } from './types'

/**
 * Stripe (Managed Payments) billing, the pure part. JSVM-safe: plain data + sync functions only.
 *
 * A Stripe price's `lookup_key` is the internal SKU it sells (e.g. `hosting.slot.recurring.month`), so no Stripe ids
 * live in code: checkout finds the price by lookup key, and webhooks read the SKU back off the price. The same code
 * then works against a Stripe sandbox and the live account.
 */

/** Stripe API version every request pins. Managed Payments on Checkout Sessions needs 2025-03-31.basil or later. */
export const STRIPE_API_VERSION = '2026-04-22.dahlia'

/** SKUs sold through Stripe checkout. */
export const STRIPE_CHECKOUT_SKUS: ProductSku[] = [
  'hosting.slot.recurring.month',
  'hosting.slot.recurring.year',
  'hosting.slot.lifetime',
]

export const isStripeCheckoutSku = (sku: string | undefined): sku is ProductSku =>
  !!sku && (STRIPE_CHECKOUT_SKUS as string[]).includes(sku)

/** The SKU a Stripe price sells, from its lookup key. Undefined for prices we don't know. */
export const skuFromStripePrice = (
  price: { lookup_key?: string | null } | null | undefined
): ProductSku | undefined => {
  const key = `${price?.lookup_key || ''}`
  return isKnownSku(key) ? key : undefined
}

export type StripePrice = {
  id: string
  lookup_key?: string | null
  nickname?: string | null
  product?: string | { id: string; name?: string } | null
}

export type StripeSubscriptionItem = {
  id?: string
  quantity?: number
  price?: StripePrice
  current_period_start?: number
  current_period_end?: number
}

/** The parts of a Stripe Subscription object we read. */
export type StripeSubscription = {
  id: string
  status: string
  created?: number
  cancel_at?: number | null
  cancel_at_period_end?: boolean
  canceled_at?: number | null
  ended_at?: number | null
  /** Pre-basil API versions only; newer versions carry the period on each item. */
  current_period_end?: number
  customer?: string | null
  metadata?: Record<string, string>
  items?: { data?: StripeSubscriptionItem[] }
}

const iso = (unix: number | null | undefined) =>
  typeof unix === 'number' && unix > 0 ? new Date(unix * 1000).toISOString() : undefined

const productName = (price: StripePrice | undefined) =>
  typeof price?.product === 'object' && price.product ? price.product.name || '' : ''

/**
 * Stripe subscription status in the vocabulary billing items already use (Lemon Squeezy's), so entitlement, loyalty and
 * cancel logic work unchanged: a subscription set to end is `cancelled` until `ends_at`, as on Lemon Squeezy.
 */
export const stripeSubscriptionStatus = (
  sub: Pick<StripeSubscription, 'status' | 'cancel_at' | 'cancel_at_period_end'>
) => {
  switch (sub.status) {
    case 'active':
      return sub.cancel_at_period_end || sub.cancel_at ? 'cancelled' : 'active'
    case 'trialing':
      return sub.cancel_at_period_end || sub.cancel_at ? 'cancelled' : 'on_trial'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
      return 'expired'
    default:
      // unpaid, incomplete, paused: no access.
      return sub.status || 'unknown'
  }
}

/** Map a Stripe subscription to a billing item. Undefined when its price isn't one of ours. */
export const billingItemFromStripeSubscription = (sub: StripeSubscription): BillingItem | undefined => {
  const item = sub.items?.data?.find((i) => skuFromStripePrice(i.price))
  const sku = skuFromStripePrice(item?.price)
  if (!item || !sku) return undefined
  const entitlement = entitlementFromSku(sku, item.quantity || 1)
  const status = stripeSubscriptionStatus(sub)
  const periodEnd = item.current_period_end ?? sub.current_period_end
  const endsAt =
    status === 'cancelled' ? iso(sub.cancel_at ?? periodEnd) : status === 'expired' ? iso(sub.ended_at) : undefined
  return {
    provider: 'stripe',
    kind: 'subscription',
    external_id: sub.id,
    sku,
    quantity: entitlement.subscription_quantity,
    status,
    starts_at: iso(sub.created),
    ends_at: endsAt,
    renews_at: status === 'active' || status === 'on_trial' ? iso(periodEnd) : undefined,
    variant_id: item.price?.id || '',
    product_name: productName(item.price),
    variant_name: item.price?.nickname || '',
  }
}

/** One line item of a paid one-time (lifetime) checkout. */
export type StripeLineItem = { quantity?: number | null; price?: StripePrice | null }

/**
 * A one-time (lifetime) purchase as a billing item, keyed by its PaymentIntent so refunds (which name the
 * PaymentIntent) find it. Undefined when no line item is a lifetime price of ours.
 */
export const billingItemFromStripePayment = (p: {
  paymentIntentId: string
  created?: number
  lineItems: StripeLineItem[]
  status?: 'paid' | 'refunded' | 'partial_refund'
}): BillingItem | undefined => {
  const line = p.lineItems.find((l) => {
    const sku = skuFromStripePrice(l.price)
    return !!sku && sku === 'hosting.slot.lifetime'
  })
  const sku = skuFromStripePrice(line?.price)
  if (!line || !sku) return undefined
  const entitlement = entitlementFromSku(sku, line.quantity || 1)
  return {
    provider: 'stripe',
    kind: 'order',
    external_id: p.paymentIntentId,
    sku,
    quantity: entitlement.subscription_quantity,
    status: p.status || 'paid',
    starts_at: iso(p.created),
    variant_id: line.price?.id || '',
    product_name: productName(line.price ?? undefined),
    variant_name: line.price?.nickname || '',
  }
}

/** Order status after a refund on its charge. */
export const stripeRefundStatus = (charge: { amount?: number; amount_refunded?: number; refunded?: boolean }) =>
  charge.refunded || (charge.amount && charge.amount_refunded && charge.amount_refunded >= charge.amount)
    ? ('refunded' as const)
    : ('partial_refund' as const)

/**
 * The subscription an invoice belongs to. API versions from basil on moved it to `parent.subscription_details`; older
 * ones have `subscription`.
 */
export const invoiceSubscriptionId = (invoice: any): string | undefined => {
  const v = invoice?.parent?.subscription_details?.subscription ?? invoice?.subscription
  if (!v) return undefined
  return typeof v === 'string' ? v : v.id
}

/** Encode params the way Stripe's form API wants them: `a[b][0][c]=v`. Undefined and null are left out. */
export const stripeForm = (params: Record<string, unknown>): string => {
  const parts: string[] = []
  const walk = (prefix: string, value: unknown) => {
    if (value === undefined || value === null) return
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(`${prefix}[${i}]`, v))
      return
    }
    if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) walk(`${prefix}[${k}]`, v)
      return
    }
    parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(`${value}`)}`)
  }
  for (const [k, v] of Object.entries(params)) walk(k, v)
  return parts.join('&')
}

/** Webhook signatures older than this are rejected (Stripe's own default). */
export const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300

/**
 * Check a `Stripe-Signature` header (`t=<unix>,v1=<hex>[,v1=...]`) against the raw body. `hs256(data, secret)` returns
 * the hex HMAC-SHA256 (PocketBase's `$security.hs256`), `equal` compares in constant time.
 */
export const verifyStripeSignature = (p: {
  header: string | null | undefined
  raw: string
  secret: string
  nowSeconds: number
  hs256: (data: string, secret: string) => string
  equal: (a: string, b: string) => boolean
}): boolean => {
  if (!p.header || !p.secret) return false
  let t = ''
  const v1: string[] = []
  for (const part of p.header.split(',')) {
    const [k, ...rest] = part.trim().split('=')
    const v = rest.join('=')
    if (k === 't') t = v
    else if (k === 'v1' && v) v1.push(v)
  }
  const ts = Number(t)
  if (!t || !Number.isFinite(ts) || !v1.length) return false
  if (Math.abs(p.nowSeconds - ts) > STRIPE_SIGNATURE_TOLERANCE_SECONDS) return false
  const expected = p.hs256(`${t}.${p.raw}`, p.secret)
  return v1.some((sig) => p.equal(expected, sig))
}
