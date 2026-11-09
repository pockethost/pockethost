/**
 * Which PocketHost user owns which Lemon Squeezy subscription / order, learned from LS webhook audit records.
 *
 * Checkout links carry `custom_data.user_id`, so a webhook that has it names the buyer for certain. That tie is by
 * resource ID, so it still holds after the customer changes their email in Lemon Squeezy (email matching does not).
 *
 * JSVM-safe: plain data + sync functions only.
 */

/** `subscription:<id>` or `order:<id>`; the same shape `lsResourceKeyOfItem` gives a billing item. */
export type LsResourceKey = string

export type LsClaims = {
  /** LS resource → the user whose checkout it was. */
  owners: { [key: LsResourceKey]: string }
  /** User → emails seen on their own checkouts. */
  emails: { [userId: string]: string[] }
  /** Resources claimed by more than one user. Ignored, so email matching decides them. */
  conflicts: LsResourceKey[]
}

/** Minimal shape of the `context` the LS webhook handler audits. */
type WebhookAuditContext = {
  user_id_source?: string
  data?: {
    meta?: { custom_data?: { user_id?: unknown } }
    data?: {
      type?: string
      id?: unknown
      attributes?: { user_email?: unknown; subscription_id?: unknown }
    }
  }
}

const str = (v: unknown) => `${v ?? ''}`.trim()
const lc = (v: unknown) => str(v).toLowerCase()

export const lsResourceKey = (kind: 'subscription' | 'order', id: unknown): LsResourceKey | undefined =>
  str(id) ? `${kind}:${str(id)}` : undefined

/** Key for a billing item, or undefined when it is not a Lemon Squeezy row. */
export const lsResourceKeyOfItem = (item: {
  provider: string
  kind: string
  external_id: string
}): LsResourceKey | undefined => {
  if (item.provider !== 'lemonsqueezy') return undefined
  if (item.kind !== 'subscription' && item.kind !== 'order') return undefined
  return lsResourceKey(item.kind, item.external_id)
}

/** The subscription / order a webhook payload's `data` is about. */
export const lsResourceKeyOfWebhookData = (
  data: NonNullable<WebhookAuditContext['data']>['data']
): LsResourceKey | undefined => {
  switch (data?.type) {
    case 'orders':
      return lsResourceKey('order', data.id)
    case 'subscriptions':
      return lsResourceKey('subscription', data.id)
    case 'subscription-invoices':
      return lsResourceKey('subscription', data.attributes?.subscription_id)
    default:
      return undefined
  }
}

/**
 * Build claims from parsed audit `context` values. Only records tied by checkout `custom_data.user_id` count; ones the
 * old handler matched by email (`user_id_source: 'email'`) never do.
 */
export const lsClaimsFromAudit = (contexts: unknown[]): LsClaims => {
  const owners: { [key: LsResourceKey]: string } = {}
  const conflicted: { [key: LsResourceKey]: true } = {}
  const emails: { [userId: string]: { [email: string]: true } } = {}

  for (const raw of contexts) {
    const c = raw as WebhookAuditContext | null
    if (!c || typeof c !== 'object' || c.user_id_source === 'email') continue
    const userId = str(c.data?.meta?.custom_data?.user_id)
    if (!userId) continue

    const email = lc(c.data?.data?.attributes?.user_email)
    if (email) (emails[userId] = emails[userId] || {})[email] = true

    const key = lsResourceKeyOfWebhookData(c.data?.data)
    if (!key || conflicted[key]) continue
    if (owners[key] && owners[key] !== userId) {
      conflicted[key] = true
      delete owners[key]
      continue
    }
    owners[key] = userId
  }

  const emailLists: { [userId: string]: string[] } = {}
  for (const userId of Object.keys(emails)) emailLists[userId] = Object.keys(emails[userId]!)
  return { owners, emails: emailLists, conflicts: Object.keys(conflicted) }
}

/**
 * Extend claims to subscriptions through the order that started them. Checkout webhooks for a new subscription are
 * usually logged as `order_created` (keyed by order ID), while the billing row is keyed by subscription ID; LS links
 * them via the subscription's `order_id`. A subscription claimed directly by a different user becomes a conflict.
 * Returns a new claims object; the input is not changed.
 */
export const claimSubscriptionsByOrder = (
  claims: LsClaims,
  links: { subscriptionId: unknown; orderId: unknown }[]
): LsClaims => {
  const owners = { ...claims.owners }
  const conflicted: { [key: LsResourceKey]: true } = {}
  for (const key of claims.conflicts) conflicted[key] = true

  for (const link of links) {
    const subKey = lsResourceKey('subscription', link.subscriptionId)
    const orderKey = lsResourceKey('order', link.orderId)
    if (!subKey || !orderKey || conflicted[subKey]) continue
    const buyer = claims.owners[orderKey]
    if (!buyer) continue
    if (owners[subKey] && owners[subKey] !== buyer) {
      conflicted[subKey] = true
      delete owners[subKey]
      continue
    }
    owners[subKey] = buyer
  }
  return { owners, emails: claims.emails, conflicts: Object.keys(conflicted) }
}
