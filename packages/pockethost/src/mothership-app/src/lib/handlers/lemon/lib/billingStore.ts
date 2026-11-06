import {
  baselineExternalId,
  baselineItemFromUser,
  billingItemFromLsOrder,
  billingItemFromLsSubscription,
  isBaselineExternalId,
  reconcileEntitlement,
  type BillingItem,
  type LsSubscriptionResource,
  type ReconciledEntitlement,
} from '$common/billing/billingItems'
import { lsOrdersByEmail, lsSubscriptionsByEmail } from './lsApi'

const COLLECTION = `billing_items`

/** PB stores dates as `2026-12-01 00:00:00.000Z`; normalize to ISO so Goja's Date parses it. */
const isoOrUndefined = (value: string) => (value ? value.replace(' ', 'T') : undefined)

const toItem = (rec: core.Record): BillingItem => ({
  provider: rec.getString(`provider`) as BillingItem['provider'],
  kind: rec.getString(`kind`) as BillingItem['kind'],
  external_id: rec.getString(`external_id`),
  sku: rec.getString(`sku`) as BillingItem['sku'],
  quantity: rec.getInt(`quantity`),
  status: rec.getString(`status`),
  ends_at: isoOrUndefined(rec.getString(`ends_at`)),
  renews_at: isoOrUndefined(rec.getString(`renews_at`)),
  variant_id: rec.getString(`variant_id`),
  product_name: rec.getString(`product_name`),
  variant_name: rec.getString(`variant_name`),
})

export const findBillingItemRecord = (app: core.App, item: Pick<BillingItem, 'provider' | 'kind' | 'external_id'>) => {
  try {
    return app.findFirstRecordByFilter(
      COLLECTION,
      `provider = {:provider} && kind = {:kind} && external_id = {:external_id}`,
      { provider: item.provider, kind: item.kind, external_id: item.external_id }
    )
  } catch {
    return undefined
  }
}

export const loadBillingItemRecords = (app: core.App, userId: string) =>
  app
    .findRecordsByFilter(COLLECTION, `user = {:user}`, `created`, 0, 0, { user: userId })
    .filter((r): r is core.Record => !!r)

export const loadBillingItems = (app: core.App, userId: string): BillingItem[] =>
  loadBillingItemRecords(app, userId).map(toItem)

const storedOrderId = (rec: core.Record) => {
  try {
    return `${JSON.parse(rec.getString(`provider_data`) || `null`)?.order_id ?? ''}`
  } catch {
    return ``
  }
}

/** Every Lemon Squeezy row, with the user it is currently on (and, for subscriptions, the order that started it). */
export const loadAllLsBillingItems = (app: core.App): { userId: string; item: BillingItem; orderId: string }[] =>
  app
    .findRecordsByFilter(COLLECTION, `provider = 'lemonsqueezy'`, `created`, 0, 0)
    .filter((r): r is core.Record => !!r)
    .map((r) => ({
      userId: r.getString(`user`),
      item: toItem(r),
      orderId: r.getString(`kind`) === `subscription` ? storedOrderId(r) : ``,
    }))

/**
 * Insert or update one billing item. When `providerUpdatedAt` is given and the stored row is newer, the write is
 * skipped so out-of-order webhooks cannot roll state back.
 */
export const upsertBillingItem = (
  app: core.App,
  userId: string,
  item: BillingItem,
  options: { providerData?: unknown; providerUpdatedAt?: string; note?: string } = {}
): { record: core.Record; skipped: boolean } => {
  const existing = findBillingItemRecord(app, item)
  if (existing && options.providerUpdatedAt) {
    // JSON fields come back from Goja as raw bytes; read them as a string and parse.
    const stored = (() => {
      try {
        return JSON.parse(existing.getString(`provider_data`) || `null`)?.updated_at
      } catch {
        return undefined
      }
    })()
    if (stored && new Date(stored).getTime() > new Date(options.providerUpdatedAt).getTime()) {
      return { record: existing, skipped: true }
    }
  }

  const rec = existing || new Record(app.findCollectionByNameOrId(COLLECTION))
  rec.set(`user`, userId)
  rec.set(`provider`, item.provider)
  rec.set(`kind`, item.kind)
  rec.set(`external_id`, item.external_id)
  rec.set(`sku`, item.sku)
  rec.set(`quantity`, item.quantity)
  rec.set(`status`, item.status)
  rec.set(`ends_at`, item.ends_at || ``)
  rec.set(`renews_at`, item.renews_at || ``)
  rec.set(`variant_id`, item.variant_id || ``)
  rec.set(`product_name`, item.product_name || ``)
  rec.set(`variant_name`, item.variant_name || ``)
  if (options.note !== undefined) rec.set(`note`, options.note)
  if (options.providerData !== undefined) rec.set(`provider_data`, options.providerData)
  app.save(rec)
  return { record: rec, skipped: false }
}

export const upsertLsSubscription = (app: core.App, userId: string, sub: LsSubscriptionResource) => {
  const item = billingItemFromLsSubscription(sub)
  if (!item) {
    throw new Error(`Unknown Lemon Squeezy variant on subscription ${sub.id}`)
  }
  const attrs = (sub.attributes || {}) as any
  return {
    item,
    ...upsertBillingItem(app, userId, item, { providerData: attrs, providerUpdatedAt: attrs.updated_at }),
  }
}

export type LsSyncReport = {
  subscriptions: number
  orders: number
  /** LS resources found by email whose variant PocketHost does not know (e.g. retired variants). */
  unknown: string[]
}

/** Pull every LS subscription + lifetime order for the user's email and upsert them. */
const lc = (s: unknown) => `${s ?? ''}`.trim().toLowerCase()

const readBillingLinks = (userRec: core.Record): any => {
  try {
    return JSON.parse(userRec.getString(`billing_links`) || `null`) || {}
  } catch {
    return {}
  }
}

/** Every email this user has bought under on Lemon Squeezy: the account email plus recorded alternates. */
export const lsEmailsFor = (userRec: core.Record): string[] => {
  const alt: unknown[] = readBillingLinks(userRec)?.lemonsqueezy?.emails || []
  return [...new Set([lc(userRec.getString(`email`)), ...alt.map(lc)])].filter(Boolean)
}

/**
 * Record LS checkout emails that differ from the account email. Only call with emails tied to this user by checkout
 * `custom_data.user_id` (or an existing billing item), never by email lookup. Returns true when something was added.
 */
export const rememberLsEmails = (app: core.App, userRec: core.Record, emails: string[]) => {
  const known = lsEmailsFor(userRec)
  const add = emails.map(lc).filter((e) => e && !known.includes(e))
  if (!add.length) return false
  const links = readBillingLinks(userRec)
  links.lemonsqueezy = links.lemonsqueezy || {}
  links.lemonsqueezy.emails = [...new Set([...(links.lemonsqueezy.emails || []).map(lc), ...add])]
  userRec.set(`billing_links`, links)
  app.saveNoValidate(userRec)
  return true
}

export const syncUserFromLemonSqueezy = (app: core.App, userRec: core.Record, dryRun = false) => {
  const report: LsSyncReport = { subscriptions: 0, orders: 0, unknown: [] }
  const items: { item: BillingItem; providerData: any }[] = []

  for (const email of lsEmailsFor(userRec)) {
    for (const sub of lsSubscriptionsByEmail(email)) {
      const item = billingItemFromLsSubscription(sub)
      if (!item) {
        report.unknown.push(`subscription:${sub.id}:${(sub.attributes as any)?.variant_name || '?'}`)
        continue
      }
      items.push({ item, providerData: sub.attributes })
      report.subscriptions++
    }

    for (const order of lsOrdersByEmail(email)) {
      const item = billingItemFromLsOrder(order)
      if (!item) continue // recurring orders are covered by their subscription
      items.push({ item, providerData: order.attributes })
      report.orders++
    }
  }

  if (!dryRun) {
    for (const { item, providerData } of items) {
      upsertBillingItem(app, userRec.id, item, { providerData })
    }
  }
  return { report, items: items.map((i) => i.item) }
}

const userEntitlementFields = (userRec: core.Record) => ({
  subscription: userRec.getString(`subscription`),
  subscription_interval: userRec.getString(`subscription_interval`),
  subscription_quantity: userRec.getInt(`subscription_quantity`),
  product_sku: userRec.getString(`product_sku`),
  subscription_status: userRec.getString(`subscription_status`),
})

/**
 * Make sure a user with a non-LS plan (founder / legacy / grandfathered hacker) has their own baseline row. Also
 * re-keys a row left by the pre-fix bug, where every user shared one `baseline:<sku>` row. Returns true if a row was
 * written.
 */
export const ensureBaseline = (
  app: core.App,
  userRec: core.Record,
  records = loadBillingItemRecords(app, userRec.id)
) => {
  const own = records.find((r) => r.getString(`kind`) === `manual` && isBaselineExternalId(r.getString(`external_id`)))
  if (own) {
    if (own.getString(`external_id`) !== baselineExternalId(userRec.id)) {
      own.set(`external_id`, baselineExternalId(userRec.id))
      app.save(own)
    }
    return false
  }
  const baseline = baselineItemFromUser(userEntitlementFields(userRec), userRec.id)
  if (!baseline) return false
  upsertBillingItem(app, userRec.id, baseline, { note: `Pre-billing_items entitlement snapshot` })
  return true
}

/**
 * Before applying an LS event: keep the user's non-LS baseline, and the first time we see them pull their existing LS
 * purchases, so the event adds to — rather than replaces — what they have.
 */
export const ensureUserBootstrapped = (app: core.App, userRec: core.Record) => {
  const records = loadBillingItemRecords(app, userRec.id)
  ensureBaseline(app, userRec, records)
  if (records.some((r) => r.getString(`provider`) === `lemonsqueezy`)) return false
  syncUserFromLemonSqueezy(app, userRec)
  return true
}

const applyEntitlement = (userRec: core.Record, e: ReconciledEntitlement) => {
  userRec.set(`subscription`, e.subscription)
  userRec.set(`subscription_interval`, e.subscription_interval)
  userRec.set(`subscription_quantity`, e.subscription_quantity)
  userRec.set(`product_sku`, e.product_sku)
  userRec.set(`subscription_status`, e.subscription_status)
}

/** Recompute the user's entitlement from all billing items and save it. */
export const reconcileUser = (app: core.App, userRec: core.Record, items = loadBillingItems(app, userRec.id)) => {
  const before = userRec.getInt(`subscription_quantity`)
  const entitlement = reconcileEntitlement(items, new Date())
  applyEntitlement(userRec, entitlement)
  if (items.some((i) => i.provider === `lemonsqueezy`)) {
    userRec.set(`billing_provider`, `lemonsqueezy`)
  }
  // Only billing fields change here; skip full-record validation so a legacy row with e.g. an invalid email
  // can still have its entitlement corrected.
  app.saveNoValidate(userRec)
  return { before, after: entitlement.subscription_quantity, entitlement }
}
