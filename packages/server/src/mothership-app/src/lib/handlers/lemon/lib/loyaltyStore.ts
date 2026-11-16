import {
  LOYALTY_MONTHLY_SKUS,
  LOYALTY_UPFRONT_SKUS,
  loyaltyBonus,
  loyaltyNote,
  type LoyaltyResult,
} from '$common/billing/loyalty'
import { loadBillingItems } from './billingStore'

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
 * Recompute the account's loyalty bonus from its billing items (the subscription chain's start dates) and keep its
 * single `loyalty` grant row in line: amount = bonus, removed at 0. The `bonus_grants` hooks then recompute
 * `users.bonus_instances`. Manual grants are never touched. No Lemon Squeezy calls.
 */
export const syncLoyalty = (
  app: core.App,
  userId: string,
  options: { apply?: boolean; now?: Date } = {}
): LoyaltySync => {
  const apply = options.apply ?? true
  const now = options.now ?? new Date()
  const items = loadBillingItems(app, userId)
  const paidInstances = app.findRecordById(`users`, userId).getFloat(`subscription_quantity`)
  const result = loyaltyBonus(items, now, paidInstances)

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
 * Users the loyalty backfill looks at: anyone with a Lemon Squeezy or Stripe lifetime, annual or monthly per-instance
 * purchase, plus anyone who already has a loyalty grant (so stale ones get cleared). Sorted by id so `offset` paging is
 * stable.
 */
export const loyaltyCandidateUserIds = (app: core.App): string[] => {
  const skus = [...LOYALTY_UPFRONT_SKUS, ...LOYALTY_MONTHLY_SKUS].map((s) => `'${s}'`).join(`, `)
  const rows = arrayOf(new DynamicModel({ user: '' }))
  app
    .db()
    .newQuery(
      `SELECT DISTINCT user FROM billing_items WHERE provider IN ('lemonsqueezy', 'stripe') AND sku IN (${skus})
       UNION SELECT DISTINCT user FROM bonus_grants WHERE source = 'loyalty'
       ORDER BY user`
    )
    .all(rows)
  return rows.map((r) => `${r.user}`).filter(Boolean)
}
