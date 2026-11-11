import {
  activeMonthlySubscriptionIds,
  hasUpfrontLoyalty,
  LOYALTY_MONTHLY_SKUS,
  LOYALTY_UPFRONT_SKUS,
  loyaltyBonus,
  loyaltyNote,
  type LoyaltyResult,
} from '$common/billing/loyalty'
import { loadBillingItems } from './billingStore'
import { lsPaidRenewalCount } from './lsApi'

const GRANTS = `bonus_grants`

/** The account's one `loyalty` grant row, if any. */
export const findLoyaltyGrant = (app: core.App, userId: string): core.Record | undefined => {
  try {
    return app.findFirstRecordByFilter(GRANTS, `user = {:user} && source = 'loyalty'`, { user: userId })
  } catch {
    return undefined
  }
}

export type LoyaltySync = LoyaltyResult & {
  /** Bonus on the loyalty grant before this sync. */
  before: number
  changed: boolean
}

/**
 * Recompute the account's loyalty bonus from its billing items and each active monthly subscription's paid renewal
 * count (read from Lemon Squeezy), and keep its single `loyalty` grant row in line: amount = bonus, removed at 0. The
 * `bonus_grants` hooks then recompute `users.bonus_instances`. Manual grants are never touched.
 *
 * `fetchRenewals` is injectable for the backfill's pacing (and tests); it defaults to the LS API.
 */
export const syncLoyalty = (
  app: core.App,
  userId: string,
  options: { apply?: boolean; fetchRenewals?: (subscriptionId: string) => number; now?: Date } = {}
): LoyaltySync => {
  const apply = options.apply ?? true
  const now = options.now ?? new Date()
  const fetchRenewals = options.fetchRenewals ?? lsPaidRenewalCount
  const items = loadBillingItems(app, userId)

  // Lifetime and annual get the full bonus without any LS calls.
  const renewals: Record<string, number> = {}
  if (!hasUpfrontLoyalty(items, now)) {
    for (const id of activeMonthlySubscriptionIds(items, now)) renewals[id] = fetchRenewals(id)
  }
  const result = loyaltyBonus(items, renewals, now)

  const grant = findLoyaltyGrant(app, userId)
  const before = grant ? grant.getInt(`amount`) : 0
  const note = loyaltyNote(result)
  const changed = result.bonus !== before || (result.bonus > 0 && grant?.getString(`note`) !== note)

  if (apply && changed) {
    if (result.bonus === 0) {
      if (grant) app.delete(grant)
    } else {
      const rec = grant || new Record(app.findCollectionByNameOrId(GRANTS))
      rec.set(`user`, userId)
      rec.set(`source`, `loyalty`)
      rec.set(`amount`, result.bonus)
      rec.set(`note`, note)
      app.save(rec)
    }
  }
  return { ...result, before, changed }
}

/**
 * Users the loyalty backfill looks at: anyone with a Lemon Squeezy lifetime, annual or monthly per-instance purchase,
 * plus anyone who already has a loyalty grant (so stale ones get cleared). Sorted by id so `offset` paging is stable.
 */
export const loyaltyCandidateUserIds = (app: core.App): string[] => {
  const skus = [...LOYALTY_UPFRONT_SKUS, ...LOYALTY_MONTHLY_SKUS].map((s) => `'${s}'`).join(`, `)
  const rows = arrayOf(new DynamicModel({ user: '' }))
  app
    .db()
    .newQuery(
      `SELECT DISTINCT user FROM billing_items WHERE provider = 'lemonsqueezy' AND sku IN (${skus})
       UNION SELECT DISTINCT user FROM bonus_grants WHERE source = 'loyalty'
       ORDER BY user`
    )
    .all(rows)
  return rows.map((r) => `${r.user}`).filter(Boolean)
}
