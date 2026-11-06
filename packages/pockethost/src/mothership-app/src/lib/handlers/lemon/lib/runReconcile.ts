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
import {
  claimSubscriptionsByOrder,
  lsClaimsFromAudit,
  lsResourceKeyOfItem,
  type LsResourceKey,
} from '$common/billing/lsClaims'
import { resolveUserEntitlements } from '$common/billing/resolveUserEntitlements'
import {
  ensureBaseline,
  loadAllLsBillingItems,
  loadBillingItems,
  lsEmailsFor,
  reconcileUser,
  rememberLsEmails,
  upsertBillingItem,
} from './billingStore'
import { lsRequest } from './lsApi'

/**
 * A billing item to keep for a user. `providerData` is fresh LS data to store; `move` re-homes an existing row (no
 * fresh data) onto this user. Either one means the row is written on apply.
 */
type Found = { item: BillingItem; providerData: unknown; move?: boolean }

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

/** Parsed `context` of every LS webhook audit record. */
const lsAuditContexts = (): unknown[] => {
  const out: unknown[] = []
  for (const rec of $app.findRecordsByFilter(`audit`, `event ~ 'LS'`, ``, 0, 0)) {
    if (!rec) continue
    try {
      out.push(JSON.parse(rec.getString(`context`) || `null`))
    } catch {
      // unparseable context: nothing to learn from it
    }
  }
  return out
}

type Plan = {
  userRec: core.Record
  merged: { [key: string]: Found }
  /** Emails to record in `billing_links`: from old checkouts, and the current LS email of purchases tied by ID. */
  rememberEmails: string[]
  /** Rows on this user that a checkout ties to another user; moved to that user on apply. */
  gives: { item: BillingItem; to: string }[]
  /** Rows a checkout ties to this user that sit on another user now; moved here on apply. */
  takes: { key: string; from: string }[]
  preserveWrite?: { item: BillingItem; note: string }
  summary: any
  changed: boolean
  reduced: boolean
}

/**
 * Rebuild `billing_items` from Lemon Squeezy and recompute users' slots.
 *
 * A purchase belongs to the user its checkout named (`custom_data.user_id`, learned from old webhook audit records),
 * matched by LS subscription / order ID, so it is found even after the customer changes their email in Lemon Squeezy,
 * and it never goes to a different account that happens to share an email. Purchases no checkout ties to anyone are
 * matched by email: the account email plus alternate LS emails (recorded in `billing_links` or seen on old checkouts).
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
  const auditClaims = lsClaimsFromAudit(lsAuditContexts())
  /** Extended below with subscriptions claimed through the order that started them. */
  let claims = auditClaims
  const auditAlt = auditClaims.emails
  const emailsOf = (rec: core.Record) => [...new Set([...lsEmailsFor(rec), ...(auditAlt[rec.id] || [])])]

  const existsCache: { [id: string]: boolean } = {}
  const userExists = (id: string) => {
    if (!(id in existsCache)) {
      try {
        $app.findRecordById(`users`, id)
        existsCache[id] = true
      } catch {
        existsCache[id] = false
      }
    }
    return existsCache[id]!
  }
  /** The user a checkout ties this LS resource to, if that account still exists. */
  const ownerOf = (key: LsResourceKey | undefined) => {
    const owner = key ? claims.owners[key] : undefined
    return owner && userExists(owner) ? owner : undefined
  }
  let ownedBy: { [userId: string]: LsResourceKey[] } = {}
  const indexOwners = () => {
    ownedBy = {}
    for (const key of Object.keys(claims.owners)) {
      const userId = claims.owners[key]!
      ;(ownedBy[userId] = ownedBy[userId] || []).push(key)
    }
  }
  indexOwners()

  // 1. Everything LS knows, grouped by lowercase email and indexed by resource.
  const byEmail: { [email: string]: Found[] } = {}
  const byKey: { [key: LsResourceKey]: Found } = {}
  const unknown: string[] = []
  const unknownOrders: string[] = []
  const idFetchErrors: string[] = []
  let lsSubscriptionsSeen = 0
  const push = (email: string, found: Found) => {
    const k = lc(email)
    ;(byEmail[k] = byEmail[k] || []).push(found)
    const resourceKey = lsResourceKeyOfItem(found.item)
    if (resourceKey) byKey[resourceKey] = found
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
  // Where every LS row lives right now.
  const holders: { [key: LsResourceKey]: { userId: string; item: BillingItem } } = {}
  const subscriptionOrders: { subscriptionId: string; orderId: unknown }[] = []
  for (const row of loadAllLsBillingItems($app)) {
    const key = lsResourceKeyOfItem(row.item)
    if (key) holders[key] = row
    if (row.item.kind === `subscription` && row.orderId)
      subscriptionOrders.push({ subscriptionId: row.item.external_id, orderId: row.orderId })
  }
  // A new subscription's checkout is logged against its first order; carry that claim over to the subscription.
  for (const found of Object.values(byKey)) {
    if (found.item.kind === `subscription`)
      subscriptionOrders.push({ subscriptionId: found.item.external_id, orderId: (found.providerData as any)?.order_id })
  }
  claims = claimSubscriptionsByOrder(auditClaims, subscriptionOrders)
  indexOwners()

  if (onlyUser) {
    // An email search can't find purchases whose LS email has since changed; fetch the user's own ones by ID.
    for (const key of ownedBy[onlyUser.id] || []) {
      if (byKey[key]) continue
      const sep = key.indexOf(`:`)
      const kind = key.slice(0, sep)
      const id = key.slice(sep + 1)
      try {
        const data = lsRequest(
          `GET`,
          `/${kind === `order` ? `orders` : `subscriptions`}/${encodeURIComponent(id)}`
        )?.data
        const a = (data?.attributes || {}) as any
        if (!data || `${a.store_id ?? ''}` !== `${storeId}`) continue
        const item = kind === `order` ? billingItemFromLsOrder(data) : billingItemFromLsSubscription(data)
        if (item) push(`${a.user_email || ''}`, { item, providerData: a })
      } catch (err) {
        idFetchErrors.push(`${key}: ${err}`)
      }
    }
  }

  // 2. Candidate users: anyone holding slots, anyone LS knows by email, anyone a checkout ties to a purchase or email.
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
    for (const id of new Set([...Object.keys(auditAlt), ...Object.keys(ownedBy)])) {
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
      const active = found.filter(
        (f) => !ownerOf(lsResourceKeyOfItem(f.item)) && reconcileEntitlement([f.item], new Date()).subscription_quantity
      )
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
      const uid = userRec.id
      const email = lc(userRec.getString(`email`))
      const emails = emailsOf(userRec)
      const altEmails = emails.filter((em) => em !== email)
      if (altEmails.length) usersWithAltEmails++
      const current = userFields(userRec)
      const existing = loadBillingItems($app, uid)
      /** False for an LS purchase a checkout ties to some other (existing) account. */
      const isMine = (item: BillingItem) => {
        const owner = ownerOf(lsResourceKeyOfItem(item))
        return !owner || owner === uid
      }

      const merged: { [key: string]: Found } = {}
      const gives: Plan['gives'] = []
      for (const item of existing) {
        if (isMine(item)) merged[keyOf(item)] = { item, providerData: undefined }
        else gives.push({ item, to: ownerOf(lsResourceKeyOfItem(item))! })
      }
      for (const em of emails) {
        for (const found of byEmail[em] || []) if (isMine(found.item)) merged[keyOf(found.item)] = found
      }
      const rememberEmails = [...(auditAlt[uid] || [])]
      for (const key of ownedBy[uid] || []) {
        const fresh = byKey[key]
        if (fresh) {
          merged[keyOf(fresh.item)] = fresh
          const lsEmail = lc((fresh.providerData as any)?.user_email)
          if (lsEmail) rememberEmails.push(lsEmail)
          continue
        }
        // Not in this LS listing: keep the stored row, re-homing it if it sits on someone else.
        const held = holders[key]
        if (held && held.userId !== uid)
          merged[keyOf(held.item)] = { item: held.item, providerData: undefined, move: true }
      }
      // Only purchases a checkout ties to this user. Unclaimed rows shared by email keep their old behavior.
      const takes: Plan['takes'] = []
      for (const key of ownedBy[uid] || []) {
        const holder = holders[key]
        if (holder && holder.userId !== uid && merged[keyOf(holder.item)]) takes.push({ key, from: holder.userId })
      }

      const hasBaseline = existing.some((i) => i.kind === `manual` && isBaselineExternalId(i.external_id))
      if (!hasBaseline) {
        const baseline = baselineItemFromUser(current, uid)
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
            external_id: `${PRESERVE_PREFIX}${uid}`,
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
          preserveReleased.push({ user_id: uid, email, was: oldPreserve.quantity })
        }
      }

      const items = preserveItem ? [...base, preserveItem] : base
      const computed = reconcileEntitlement(items, now)
      if (preserveItem && isBillingItemActive(preserveItem, now)) {
        preserved.push({
          user_id: uid,
          email,
          slots: preserveItem.quantity,
          ends_at: preserveItem.ends_at || null,
        })
      }

      const summary = {
        user_id: uid,
        email,
        alt_emails: altEmails,
        ls_ids_claimed: (ownedBy[uid] || []).length,
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
        takes,
        gives: gives.map((g) => ({ key: lsResourceKeyOfItem(g.item), to: g.to })),
      }
      const reduced = summary.after.quantity < summary.before.quantity
      const changed =
        summary.before.quantity !== summary.after.quantity ||
        summary.before.sku !== summary.after.sku ||
        summary.before.subscription !== summary.after.subscription ||
        !!preserveWrite ||
        takes.length > 0 ||
        gives.length > 0
      plans.push({
        userRec,
        merged,
        rememberEmails,
        gives,
        takes,
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
  const heldUsers = new Set(holdReductions ? reducing.map((p) => p.userRec.id) : [])
  const reductions = plans
    .filter((p) => p.reduced)
    .map((p) => ({
      user_id: p.summary.user_id,
      email: p.summary.email,
      before: p.summary.before.quantity,
      after: p.summary.after.quantity,
      held: holdReductions,
    }))
  // A move shows up as one user's take and/or the other's give; list it once.
  const moves: { [id: string]: { key: string; from: string; to: string; held: boolean } } = {}
  const addMove = (key: string, from: string, to: string) => {
    moves[`${key}>${to}`] = { key, from, to, held: heldUsers.has(from) || heldUsers.has(to) }
  }
  for (const p of plans) {
    for (const t of p.takes) addMove(t.key, t.from, p.userRec.id)
    for (const g of p.gives) addMove(lsResourceKeyOfItem(g.item)!, p.userRec.id, g.to)
  }
  const reassigned = Object.values(moves)

  // Accounts outside this run (single-user mode) that a claimed purchase moves off or onto: show their new totals, and
  // recompute them on apply, so a moved purchase is never left counted on the account it left.
  const inRun = new Set(plans.map((p) => p.userRec.id))
  const outside: { [id: string]: { leaving: string[]; arriving: BillingItem[] } } = {}
  const outsideOf = (id: string) => (outside[id] = outside[id] || { leaving: [], arriving: [] })
  for (const p of plans) {
    if (heldUsers.has(p.userRec.id)) continue
    for (const t of p.takes) if (!inRun.has(t.from)) outsideOf(t.from).leaving.push(t.key)
    for (const g of p.gives) if (!inRun.has(g.to)) outsideOf(g.to).arriving.push(g.item)
  }
  const affectedOutsideRun: { user_id: string; email: string; before: number; after: number }[] = []
  for (const id of Object.keys(outside)) {
    try {
      const rec = $app.findRecordById(`users`, id)
      const { leaving, arriving } = outside[id]!
      const items = [
        ...loadBillingItems($app, id).filter((i) => !leaving.includes(lsResourceKeyOfItem(i) || ``)),
        ...arriving,
      ]
      affectedOutsideRun.push({
        user_id: id,
        email: lc(rec.getString(`email`)),
        before: rec.getInt(`subscription_quantity`),
        after: reconcileEntitlement(items, now).subscription_quantity,
      })
    } catch (err) {
      errors.push({ user_id: id, error: `${err}` })
    }
  }

  if (apply) {
    for (const p of plans) {
      if (heldUsers.has(p.userRec.id)) continue
      const uid = p.userRec.id
      try {
        rememberLsEmails($app, p.userRec, p.rememberEmails)
        // Baseline first (also re-keys a pre-fix shared row), then LS rows from this pass.
        ensureBaseline($app, p.userRec)
        for (const f of Object.values(p.merged)) {
          if (f.providerData === undefined && !f.move) continue
          const key = lsResourceKeyOfItem(f.item)
          const holder = key ? holders[key] : undefined
          // Don't take a claimed purchase off a user whose drops are being held this run.
          if (key && ownerOf(key) === uid && holder && holder.userId !== uid && heldUsers.has(holder.userId)) continue
          upsertBillingItem($app, uid, f.item, f.providerData === undefined ? {} : { providerData: f.providerData })
        }
        for (const g of p.gives) {
          if (heldUsers.has(g.to)) continue
          upsertBillingItem($app, g.to, g.item)
        }
        if (p.preserveWrite) {
          upsertBillingItem($app, uid, p.preserveWrite.item, { note: p.preserveWrite.note })
        }
        reconcileUser($app, p.userRec)
      } catch (err) {
        errors.push({ user_id: p.summary.user_id, error: `${err}` })
      }
    }
    for (const a of affectedOutsideRun) {
      try {
        reconcileUser($app, $app.findRecordById(`users`, a.user_id))
      } catch (err) {
        errors.push({ user_id: a.user_id, error: `${err}` })
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
    lsIdsClaimed: Object.keys(claims.owners).length,
    lsIdClaimConflicts: claims.conflicts,
    changed: changes.length,
    gained: plans.filter((p) => p.summary.after.quantity > p.summary.before.quantity).length,
    changes,
    reductions,
    reductionsHeld: holdReductions ? reducing.length : 0,
    reassigned,
    affectedOutsideRun,
    preserveReleased,
    preserved,
    unmatchedEmails,
    unknown,
    unknownOrders,
    idFetchErrors,
    errors,
  }
}

export type ReconcileReport = ReturnType<typeof runReconcile>
