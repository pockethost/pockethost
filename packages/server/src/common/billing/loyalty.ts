import { isBillingItemActive, type BillingItem } from './billingItems'
import type { ProductSku } from './types'

/**
 * Loyalty bonus instances (pockethost-support plans/loyalty-bonus-instances-plan.md, decided with Ben 2026-11-11).
 *
 * - Lifetime (`hosting.slot.lifetime`) and annual plans: 5 bonus instances while the purchase is active.
 * - Monthly plans: +1 at the 1st paid renewal, then +1 every 3rd (1, 2, 3, 4, 5 at renewals 1, 4, 7, 10, 13).
 * - Cancelling stops new renewals (so no more earning) but the subscription stays active until its paid period ends, and
 *   so does the bonus. Resuming keeps counting on the same subscription.
 * - When a subscription expires its renewals stop counting; with nothing active left the bonus is 0 and a new
 *   subscription starts from 0.
 * - Accounts with more paid instances than the bonus cap (`LOYALTY_MAX_BONUS`) get no loyalty bonus: Founder, Flounder
 *   and other legacy plans with 250+ instances, whatever else they buy (Ben, 2026-11-15).
 *
 * The bonus is a pure function of the account's billing items and each subscription's paid renewal count, so it can be
 * recomputed after any webhook (or in a backfill) without counting events. JSVM-safe: plain data + sync functions.
 */

export const LOYALTY_MAX_BONUS = 5

/** Plans that get the full bonus up front, while active. Legacy Flounder lifetime already has 250 instances. */
export const LOYALTY_UPFRONT_SKUS: ProductSku[] = ['hosting.slot.lifetime', 'hosting.slot.recurring.year']

/** Monthly per-instance plans that earn by paid renewals. */
export const LOYALTY_MONTHLY_SKUS: ProductSku[] = [
  'hosting.slot.recurring.month',
  'hosting.slot.recurring.month.legacy',
]

/** Bonus earned by `renewals` paid monthly renewals: 0, then 1 at the 1st, +1 every 3rd after, capped at 5. */
export const bonusForRenewals = (renewals: number) => {
  const n = Math.floor(renewals)
  if (!(n >= 1)) return 0
  return Math.min(LOYALTY_MAX_BONUS, 1 + Math.floor((n - 1) / 3))
}

/** Paid renewals needed for the next bonus instance, or null at the cap. */
export const nextBonusAtRenewal = (renewals: number): number | null => {
  const bonus = bonusForRenewals(renewals)
  if (bonus >= LOYALTY_MAX_BONUS) return null
  return bonus === 0 ? 1 : 1 + bonus * 3
}

export type LoyaltyResult = {
  bonus: number
  /**
   * Why: `upfront` (lifetime or annual), `renewals` (monthly), `excluded` (more paid instances than the cap), or
   * `none`.
   */
  basis: 'upfront' | 'renewals' | 'excluded' | 'none'
  /** Paid renewals counted across active monthly subscriptions. */
  renewals: number
  /** Active monthly LS subscription ids whose renewal count is needed (to fetch before calling `loyaltyBonus`). */
  monthlySubscriptionIds: string[]
}

const isLs = (i: BillingItem) => i.provider === 'lemonsqueezy' && i.quantity > 0

/** Active LS monthly subscriptions on the account (the ones whose paid renewals count). */
export const activeMonthlySubscriptionIds = (items: BillingItem[], now: Date) =>
  items
    .filter((i) => isLs(i) && i.kind === 'subscription' && LOYALTY_MONTHLY_SKUS.includes(i.sku))
    .filter((i) => isBillingItemActive(i, now))
    .map((i) => i.external_id)

/** More paid instances than the bonus cap: no loyalty bonus at all. */
export const isLoyaltyExcluded = (paidInstances: number) => Math.floor(paidInstances) > LOYALTY_MAX_BONUS

/** True when an active lifetime or annual purchase gives the full bonus (no renewal counts needed). */
export const hasUpfrontLoyalty = (items: BillingItem[], now: Date) =>
  items.some((i) => isLs(i) && LOYALTY_UPFRONT_SKUS.includes(i.sku) && isBillingItemActive(i, now))

/**
 * The account's loyalty bonus. `renewalsBySubscription` maps an LS subscription id to its paid renewal count; missing
 * ids count as 0. `paidInstances` is `users.subscription_quantity`; above the cap the account is excluded.
 */
export const loyaltyBonus = (
  items: BillingItem[],
  renewalsBySubscription: Record<string, number>,
  now: Date,
  paidInstances = 0
): LoyaltyResult => {
  const monthlySubscriptionIds = activeMonthlySubscriptionIds(items, now)
  if (isLoyaltyExcluded(paidInstances)) return { bonus: 0, basis: 'excluded', renewals: 0, monthlySubscriptionIds }
  const renewals = monthlySubscriptionIds.reduce(
    (sum, id) => sum + Math.max(0, Math.floor(renewalsBySubscription[id] ?? 0)),
    0
  )
  if (hasUpfrontLoyalty(items, now)) {
    return { bonus: LOYALTY_MAX_BONUS, basis: 'upfront', renewals, monthlySubscriptionIds }
  }
  const bonus = bonusForRenewals(renewals)
  return { bonus, basis: bonus > 0 ? 'renewals' : 'none', renewals, monthlySubscriptionIds }
}

/** The grant note customers see in the dashboard tooltip. */
export const loyaltyNote = (r: LoyaltyResult) =>
  r.basis === 'upfront'
    ? `Loyalty bonus: ${LOYALTY_MAX_BONUS} instances with your annual or lifetime plan`
    : `Loyalty bonus: ${r.renewals} monthly renewal${r.renewals === 1 ? `` : `s`}`

/** LS subscription invoice attributes we read. */
export type LsInvoiceAttributes = { billing_reason?: string; status?: string; refunded?: boolean }

/** A paid (not refunded) renewal invoice. Initial and plan-change invoices don't count. */
export const isPaidRenewalInvoice = (a: LsInvoiceAttributes | undefined) =>
  !!a && a.billing_reason === 'renewal' && a.status === 'paid' && !a.refunded

const MONTHS = [`Jan`, `Feb`, `Mar`, `Apr`, `May`, `Jun`, `Jul`, `Aug`, `Sep`, `Oct`, `Nov`, `Dec`]

/** `Jan 13, 2027` (UTC). */
export const formatShortDate = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`

export type LoyaltyRenewalEmailVars = { current: string; next: string; max: string }

/**
 * Vars for the loyalty status emails (`loyalty_renewal` after each paid renewal, `loyalty_welcome` on a new purchase),
 * or null when one shouldn't go out (excluded accounts; no bonus yet, unless `allowZero` for a new monthly
 * subscription). `renewsAt` is the subscription's next renewal date; the renewal that earns the next bonus is that many
 * months later.
 */
export const loyaltyRenewalEmailVars = (
  result: Pick<LoyaltyResult, 'bonus' | 'basis' | 'renewals'>,
  renewsAt: string | undefined,
  options: { allowZero?: boolean } = {}
): LoyaltyRenewalEmailVars | null => {
  if (result.basis === 'excluded') return null
  if (result.bonus <= 0 && !options.allowZero) return null
  const vars = { current: `${result.bonus}`, max: `${LOYALTY_MAX_BONUS}` }
  const earning = result.basis === 'renewals' || (options.allowZero && result.basis === 'none')
  const at = earning ? nextBonusAtRenewal(result.renewals) : null
  const base = renewsAt ? new Date(renewsAt) : null
  if (at === null || !base || isNaN(base.getTime())) {
    return { ...vars, next: at === null ? `You're at the max` : `At renewal ${at}` }
  }
  const d = new Date(base.getTime())
  d.setUTCMonth(d.getUTCMonth() + (at - (result.renewals + 1)))
  return { ...vars, next: `On your ${formatShortDate(d)} renewal` }
}
