import { mkLog } from '$util/Logger'
import { mkAudit } from '$util/mkAudit'
import { loyaltyCandidateUserIds, syncLoyalty } from '../lib/loyaltyStore'
import { lsPaidRenewalCount } from '../lib/lsApi'

/**
 * Superuser: `POST /api/loyalty/backfill` - recompute loyalty bonuses for existing customers. Dry run by default.
 *
 * - `apply=1` writes the `loyalty` grant rows.
 * - `user=<id>` one user.
 * - `offset`, `limit` (default 0, 40): one page of candidates, so a run stays well inside request timeouts and Lemon
 *   Squeezy's rate limit (each monthly subscription costs one invoices call, paced 250 ms apart). Call again with
 *   `next` until it is null.
 */
export const HandleLoyaltyBackfill = (e: core.RequestEvent) => {
  const q = e.request.url.query()
  const apply = q.get(`apply`) === `1`
  const onlyUser = q.get(`user`)
  const offset = Math.max(0, Number(q.get(`offset`) || 0) || 0)
  const limit = Math.min(200, Math.max(1, Number(q.get(`limit`) || 40) || 40))

  const all = onlyUser ? [onlyUser] : loyaltyCandidateUserIds($app)
  const page = all.slice(offset, offset + limit)

  let lsCalls = 0
  const fetchRenewals = (subscriptionId: string) => {
    if (lsCalls++ > 0) sleep(250)
    return lsPaidRenewalCount(subscriptionId)
  }

  const changes: { user: string; before: number; after: number; basis: string; renewals: number }[] = []
  const errors: { user: string; error: string }[] = []
  let unchanged = 0
  for (const user of page) {
    try {
      const r = syncLoyalty($app, user, { apply, fetchRenewals })
      if (r.changed) changes.push({ user, before: r.before, after: r.bonus, basis: r.basis, renewals: r.renewals })
      else unchanged++
    } catch (err) {
      errors.push({ user, error: `${err}` })
    }
  }

  const next = offset + page.length < all.length ? offset + page.length : null
  const report = { mode: apply ? `apply` : `dry-run`, total: all.length, offset, next, unchanged, changes, errors }
  if (apply && (changes.length || errors.length)) {
    mkAudit(mkLog(`loyalty-backfill`), $app)(
      `LS`,
      `Loyalty backfill (offset ${offset}): ${changes.length} changed, ${errors.length} errors.`,
      { changes, errors }
    )
  }
  return e.json(200, report)
}
