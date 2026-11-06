import {
  baselineItemFromUser,
  billingItemFromLsOrder,
  billingItemFromLsSubscription,
  isBaselineExternalId,
  isBillingItemActive,
  isRecurringLsOrder,
  reconcileEntitlement,
  type BillingItem,
  type LsOrderResource,
  type LsSubscriptionResource,
} from '$common/billing/billingItems'
import { resolveUserEntitlements } from '$common/billing/resolveUserEntitlements'
import {
  ensureBaseline,
  loadBillingItems,
  lsEmailsFor,
  reconcileUser,
  rememberLsEmails,
  upsertBillingItem,
} from './billingStore'
import { lsRequest } from './lsApi'

type Found = { item: BillingItem; providerData: unknown }

export type ReconcileOptions = {
  /** Write billing items and user entitlements. Default: dry run. */
  apply?: boolean
  /** Limit to one user; recomputes exactly and leaves any preserve row as is. */
  onlyUserId?: string
  /**
   * One-time backfill mode: create or grow `preserve:<id>` rows so nobody's total goes down. Off by default: in normal
   * runs preserve rows can only shrink or be released, so a missed expiry webhook really lowers slots.
   */
  backfill?: boolean
  /**
   * Max users whose slots may drop in one run. Above this every drop is held and reported (a sudden mass drop more
   * likely means partial data from Lemon Squeezy than mass churn). Pass a higher value to apply a reviewed batch.
   */
  maxReductions?: number
}

const listAll = <T>(path: string): T[] => {
  const out: T[] = []
  let url: string | undefined = `${path}&page[size]=100`
  for (let guard = 0; url && guard < 500; guard++) {
    const json = lsRequest(`GET`, url)
    out.push(...((json?.data as T[]) || []))
    url = json?.links?.next || undefined
  }
  return out
}

const keyOf = (i: Pick<BillingItem, 'provider' | 'kind' | 'external_id'>) => `${i.provider}:${i.kind}:${i.external_id}`
const lc = (s: unknown) => `${s ?? ''}`.trim().toLowerCase()
const PRESERVE_PREFIX = `preserve:`
const isPreserve = (i: Pick<BillingItem, 'kind' | 'external_id'>) =>
  i.kind === `manual` && i.external_id.startsWith(PRESERVE_PREFIX)

const userFields = (rec: core.Record) => ({
  subscription: rec.getString(`subscription`),
  subscription_interval: rec.getString(`subscription_interval`),
  subscription_quantity: rec.getInt(`subscription_quantity`),
  product_sku: rec.getString(`product_sku`),
  subscription_status: rec.getString(`subscription_status`),
})

/**
 * User id → LS checkout emails, from old webhook audit records. Only pairs tied by checkout `custom_data.user_id` are
 * trusted (never ones the old handler matched by email).
 */
const altEmailsFromAudit = (): { [userId: string]: string[] } => {
  const out: { [userId: string]: Set<string> } = {}
  for (const rec of $app.findRecordsByFilter(`audit`, `event ~ 'LS'`, ``, 0, 0)) {
    if (!rec) continue
    let c: any
    try {
      c = JSON.parse(rec.getString(`context`) || `null`)
    } catch {
      continue
    }
    const customId = c?.data?.meta?.custom_data?.user_id
    const email = lc(c?.data?.data?.attributes?.user_email)
    if (!customId || !email || c?.user_id_source === `email`) continue
    ;(out[customId] = out[customId] || new Set()).add(email)
  }
  const result: { [userId: string]: string[] } = {}
  for (const [id, set] of Object.entries(out)) result[id] = [...set]
  return result
}

type Plan = {
  userRec: core.Record
  merged: { [key: string]: Found }
  altFromAudit?: string[]
  preserveWrite?: { item: BillingItem; note: string }
  summary: any
  changed: boolean
  reduced: boolean
}

/**
 * Rebuild `billing_items` from Lemon Squeezy and recompute users' slots. Purchases are found under the account email
 * and under alternate LS emails (recorded in `billing_links` or learned from old webhook audit records).
 *
 * Slots are what verified LS purchases plus any founder/legacy/grandfathered baseline support. `preserve:<id>` rows
 * from the one-time backfill are released in normal runs: if Lemon Squeezy can't show a payment, the slots go (to 0 if
 * nothing else applies, which stops the account's instances) and the customer can contact support.
 */
export const runReconcile = (opts: ReconcileOptions = {}) => {
  const apply = !!opts.apply
  const backfill = !!opts.backfill
  const maxReductions = opts.maxReductions ?? 25
  const storeId = process.env.LS_STORE_ID || $os.getenv(`LS_STORE_ID`)
  if (!storeId) {
    throw new BadRequestError(`LS_STORE_ID is not set`)
  }

  const onlyUser = opts.onlyUserId ? $app.findRecordById(`users`, opts.onlyUserId) : undefined
  const auditAlt = altEmailsFromAudit()
  const emailsOf = (rec: core.Record) => [...new Set([...lsEmailsFor(rec), ...(auditAlt[rec.id] || [])])]

  // 1. Everything LS knows, grouped by lowercase email.
  const byEmail: { [email: string]: Found[] } = {}
  const unknown: string[] = []
  const unknownOrders: string[] = []
  let lsSubscriptionsSeen = 0
  const push = (email: string, found: Found) => {
    const k = lc(email)
    ;(byEmail[k] = byEmail[k] || []).push(found)
  }
  const scopes = onlyUser ? emailsOf(onlyUser).map((em) => `&filter[user_email]=${encodeURIComponent(em)}`) : [``]
  for (const scope of scopes) {
    for (const sub of listAll<LsSubscriptionResource>(`/subscriptions?filter[store_id]=${storeId}${scope}`)) {
      lsSubscriptionsSeen++
      const a = (sub.attributes || {}) as any
      const item = billingItemFromLsSubscription(sub)
      if (!item) {
        unknown.push(`subscription ${sub.id} ${a.user_email} ${a.product_name} - ${a.variant_name} (${a.status})`)
        continue
      }
      push(`${a.user_email || ''}`, { item, providerData: a })
    }
    for (const order of listAll<LsOrderResource>(`/orders?filter[store_id]=${storeId}${scope}`)) {
      const a = (order.attributes || {}) as any
      const item = billingItemFromLsOrder(order)
      if (!item) {
        if (!isRecurringLsOrder(order)) {
          const i = a.first_order_item || {}
          unknownOrders.push(
            `order ${order.id} ${a.user_email} ${i.product_id}-${i.variant_id} ${i.product_name} - ${i.variant_name} (${a.status})`
          )
        }
        continue
      }
      push(`${a.user_email || ''}`, { item, providerData: a })
    }
  }
  if (!onlyUser && lsSubscriptionsSeen === 0) {
    // An empty store-wide listing means an API/auth problem, never "everyone churned".
    throw new Error(`Lemon Squeezy returned no subscriptions for store ${storeId}; refusing to reconcile`)
  }

  // 2. Candidate users: anyone holding slots, anyone LS knows by email, anyone tied to an LS email via checkout data.
  const users: { [id: string]: core.Record } = {}
  const addUser = (rec: core.Record | undefined) => {
    if (rec) users[rec.id] = rec
  }
  if (onlyUser) {
    addUser(onlyUser)
  } else {
    for (const rec of $app.findRecordsByFilter(
      `users`,
      `subscription != 'free' || subscription_quantity > 0 || billing_provider = 'lemonsqueezy'`,
      ``,
      0,
      0
    )) {
      addUser(rec)
    }
    for (const id of Object.keys(auditAlt)) {
      if (users[id]) continue
      try {
        addUser($app.findRecordById(`users`, id))
      } catch {
        // paired account was deleted
      }
    }
    for (const email of Object.keys(byEmail)) {
      try {
        addUser($app.findFirstRecordByFilter(`users`, `email = {:email}`, { email }))
      } catch {
        // reported below if no user claims it as an alternate email either
      }
    }
  }

  const claimed = new Set<string>()
  for (const rec of Object.values(users)) for (const em of emailsOf(rec)) claimed.add(em)
  const unmatchedEmails: string[] = []
  if (!onlyUser) {
    for (const [email, found] of Object.entries(byEmail)) {
      if (claimed.has(email)) continue
      const active = found.filter((f) => reconcileEntitlement([f.item], new Date()).subscription_quantity)
      if (active.length) unmatchedEmails.push(`${email} (${active.length} active)`)
    }
  }

  // 3. Plan every user.
  const now = new Date()
  const plans: Plan[] = []
  const preserved: any[] = []
  const preserveReleased: any[] = []
  const errors: { user_id: string; error: string }[] = []
  let usersWithAltEmails = 0

  for (const userRec of Object.values(users)) {
    try {
      const email = lc(userRec.getString(`email`))
      const emails = emailsOf(userRec)
      const altEmails = emails.filter((em) => em !== email)
      if (altEmails.length) usersWithAltEmails++
      const current = userFields(userRec)
      const existing = loadBillingItems($app, userRec.id)
      const merged: { [key: string]: Found } = {}
      for (const item of existing) merged[keyOf(item)] = { item, providerData: undefined }
      for (const em of emails) for (const found of byEmail[em] || []) merged[keyOf(found.item)] = found
      const hasBaseline = existing.some((i) => i.kind === `manual` && isBaselineExternalId(i.external_id))
      if (!hasBaseline) {
        const baseline = baselineItemFromUser(current, userRec.id)
        if (baseline) merged[keyOf(baseline)] = { item: baseline, providerData: undefined }
      }

      const all = Object.values(merged).map((f) => f.item)
      const oldPreserve = existing.find(isPreserve)
      const base = onlyUser ? all : all.filter((i) => !isPreserve(i))
      const withoutPreserve = reconcileEntitlement(base, now)
      const gap = Math.max(0, current.subscription_quantity - withoutPreserve.subscription_quantity)

      let preserveWrite: Plan['preserveWrite']
      let preserveItem: BillingItem | undefined
      if (!onlyUser) {
        if (backfill && gap > 0) {
          preserveItem = {
            provider: `manual`,
            kind: `manual`,
            external_id: `${PRESERVE_PREFIX}${userRec.id}`,
            sku:
              (oldPreserve?.sku as BillingItem['sku']) ||
              resolveUserEntitlements(current).sku ||
              `hosting.slot.recurring.month`,
            quantity: gap,
            status: `active`,
            ends_at: oldPreserve?.ends_at,
          }
          preserveWrite = { item: preserveItem, note: `Backfill: slots not explained by Lemon Squeezy. Review.` }
        } else if (oldPreserve && oldPreserve.status === `active`) {
          // Normal runs: slots Lemon Squeezy can't verify as paid are not kept. The account falls to what LS (plus any
          // founder/legacy/grandfathered baseline) supports; customers who think that's wrong can contact support.
          preserveWrite = {
            item: { ...oldPreserve, quantity: 0, status: `inactive` },
            note: `Released ${now.toISOString()}: no verified Lemon Squeezy payment for these slots.`,
          }
          preserveReleased.push({ user_id: userRec.id, email, was: oldPreserve.quantity })
        }
      }

      const items = preserveItem ? [...base, preserveItem] : base
      const computed = reconcileEntitlement(items, now)
      if (preserveItem && isBillingItemActive(preserveItem, now)) {
        preserved.push({
          user_id: userRec.id,
          email,
          slots: preserveItem.quantity,
          ends_at: preserveItem.ends_at || null,
        })
      }

      const summary = {
        user_id: userRec.id,
        email,
        alt_emails: altEmails,
        before: {
          quantity: current.subscription_quantity,
          sku: current.product_sku,
          subscription: current.subscription,
        },
        after: {
          quantity: computed.subscription_quantity,
          sku: computed.product_sku,
          subscription: computed.subscription,
        },
        items: items.map(
          (i) =>
            `${i.kind}:${i.external_id} ${i.sku} x${i.quantity} ${i.status}${i.ends_at ? ` until ${i.ends_at}` : ''}`
        ),
      }
      const reduced = summary.after.quantity < summary.before.quantity
      const changed =
        summary.before.quantity !== summary.after.quantity ||
        summary.before.sku !== summary.after.sku ||
        summary.before.subscription !== summary.after.subscription ||
        !!preserveWrite
      plans.push({
        userRec,
        merged,
        altFromAudit: auditAlt[userRec.id],
        preserveWrite,
        summary,
        changed,
        reduced,
      })
    } catch (err) {
      errors.push({ user_id: userRec.id, error: `${err}` })
    }
  }

  // 4. Guard rail, then apply.
  const reducing = plans.filter((p) => p.reduced)
  const holdReductions = !onlyUser && reducing.length > maxReductions
  const reductions = plans
    .filter((p) => p.reduced)
    .map((p) => ({
      user_id: p.summary.user_id,
      email: p.summary.email,
      before: p.summary.before.quantity,
      after: p.summary.after.quantity,
      held: holdReductions,
    }))

  if (apply) {
    for (const p of plans) {
      if (holdReductions && p.reduced) continue
      try {
        if (p.altFromAudit) rememberLsEmails($app, p.userRec, p.altFromAudit)
        // Baseline first (also re-keys a pre-fix shared row), then LS rows from this pass.
        ensureBaseline($app, p.userRec)
        for (const f of Object.values(p.merged)) {
          if (f.providerData !== undefined) {
            upsertBillingItem($app, p.userRec.id, f.item, { providerData: f.providerData })
          }
        }
        if (p.preserveWrite) {
          upsertBillingItem($app, p.userRec.id, p.preserveWrite.item, { note: p.preserveWrite.note })
        }
        reconcileUser($app, p.userRec)
      } catch (err) {
        errors.push({ user_id: p.summary.user_id, error: `${err}` })
      }
    }
  }

  const changes = plans.filter((p) => p.changed || onlyUser).map((p) => p.summary)
  return {
    dryRun: !apply,
    mode: onlyUser ? `user` : backfill ? `backfill` : `normal`,
    usersChecked: Object.keys(users).length,
    usersWithAltEmails,
    lsSubscriptionsSeen,
    changed: changes.length,
    gained: plans.filter((p) => p.summary.after.quantity > p.summary.before.quantity).length,
    changes,
    reductions,
    reductionsHeld: holdReductions ? reducing.length : 0,
    preserveReleased,
    preserved,
    unmatchedEmails,
    unknown,
    unknownOrders,
    errors,
  }
}

export type ReconcileReport = ReturnType<typeof runReconcile>
