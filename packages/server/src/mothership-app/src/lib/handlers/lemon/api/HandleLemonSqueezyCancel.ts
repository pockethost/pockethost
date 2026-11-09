import { isBillingItemActive } from '$common/billing/billingItems'
import { mkLog } from '$util/Logger'
import { mkAudit } from '$util/mkAudit'
import {
  ensureUserBootstrapped,
  loadBillingItemRecords,
  reconcileUser,
  upsertLsSubscription,
} from '../lib/billingStore'
import { lsCancelSubscription } from '../lib/lsApi'

const CANCELABLE_SKUS = [`hosting.slot.recurring.month`, `hosting.slot.recurring.month.legacy`]

/**
 * Cancel the authenticated user's monthly membership at period end.
 *
 * Body (optional): `{ "itemId": "<billing_items id>" }` cancels one subscription. Without it, every active monthly
 * subscription on the account is cancelled — users can hold several (e.g. PayPal subscriptions that could not change
 * quantity), and "cancel membership" means all of them.
 */
export const HandleLemonSqueezyCancel = (e: core.RequestEvent) => {
  const log = mkLog(`ls-cancel`)
  const audit = mkAudit(log, $app)

  try {
    const authRecord = e.auth
    if (!authRecord) {
      throw new UnauthorizedError(`Authentication required`)
    }

    const itemId = (() => {
      try {
        return `${JSON.parse(readerToString(e.request.body) || '{}')?.itemId || ''}`.trim()
      } catch {
        return ``
      }
    })()

    const userRec = $app.findRecordById(`users`, authRecord.id)
    ensureUserBootstrapped($app, userRec)

    const now = new Date()
    const targets = loadBillingItemRecords($app, userRec.id).filter((rec) => {
      if (itemId && rec.id !== itemId) return false
      return (
        rec.getString(`provider`) === `lemonsqueezy` &&
        rec.getString(`kind`) === `subscription` &&
        CANCELABLE_SKUS.includes(rec.getString(`sku`)) &&
        // Already-cancelled subscriptions are still "active" until ends_at; don't cancel them twice.
        rec.getString(`status`) !== `cancelled` &&
        isBillingItemActive({ kind: `subscription`, status: rec.getString(`status`) }, now)
      )
    })

    if (targets.length === 0) {
      throw new BadRequestError(`No cancellable membership on this account`)
    }

    const cancelled: { itemId: string; subscriptionId: string; endsAt: string | null }[] = []
    for (const rec of targets) {
      const subscriptionId = rec.getString(`external_id`)
      const sub = lsCancelSubscription(subscriptionId)
      upsertLsSubscription($app, userRec.id, sub)
      cancelled.push({ itemId: rec.id, subscriptionId, endsAt: (sub.attributes as any)?.ends_at || null })
    }

    // Access continues until ends_at; reconcile keeps cancelled-but-paid slots active.
    reconcileUser($app, userRec)

    const endsAt =
      cancelled
        .map((c) => c.endsAt)
        .filter((d): d is string => !!d)
        .sort()
        .pop() || null

    log(`subscriptions cancelled`, userRec.id, JSON.stringify(cancelled))
    audit(`LS`, `Membership cancelled via dashboard.`, { user_id: userRec.id, cancelled, ends_at: endsAt })

    return e.json(200, { status: `cancelled`, endsAt, cancelled })
  } catch (err) {
    log(`${err}`)
    throw err
  }
}
