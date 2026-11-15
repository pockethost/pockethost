import { isBillingItemActive, type BillingItem } from './billingItems'
import type { ProductSku } from './types'

/**
 * Loyalty bonus instances (pocketbrain plans/loyalty-bonus-instances-plan.md, decided with Ben 2026-11-11, chain rule
 * 2026-11-14).
 *
 * - Lifetime (`hosting.slot.lifetime`) and annual plans: 5 bonus instances while the purchase is active.
 * - Monthly: counted on the account's **chain**, its paid subscriptions laid end to end. A subscription that starts
 *   before the previous one ends (or within `LOYALTY_COMEBACK_DAYS` of it) continues the chain, so the bonus keeps
 *   counting from the chain's first start. Gap days don't count. A longer gap starts a new chain from 0. Overlapping
 *   subscriptions (a second instance) cover the same time, so they never earn faster.
 * - Whole months since the chain started: 1 bonus after the 1st month, +1 every 3 (months 1, 4, 7, 10, 13), cap 5.
 * - Accounts with more paid instances than the bonus cap (`LOYALTY_MAX_BONUS`) get no loyalty bonus: Founder, Flounder
 *   and other legacy plans with 250+ instances, whatever else they buy (Ben, 2026-11-15).
 *
 * A pure function of the account's billing items and the time, so it can be recomputed after any webhook (or in a
 * backfill). JSVM-safe: plain data + sync functions.
 */

export const LOYALTY_MAX_BONUS = 5

/** A gap up to this long between subscriptions doesn't break the chain (the gap itself doesn't count). */
export const LOYALTY_COMEBACK_DAYS = 30

/** Plans that get the full bonus up front, while active. Legacy Flounder lifetime already has 250 instances. */
export const LOYALTY_UPFRONT_SKUS: ProductSku[] = ['hosting.slot.lifetime', 'hosting.slot.recurring.year']

/** Monthly per-instance plans. */
export const LOYALTY_MONTHLY_SKUS: ProductSku[] = [
  'hosting.slot.recurring.month',
  'hosting.slot.recurring.month.legacy',
]

/** Bonus earned after `months` whole months on the chain: 0, then 1 at month 1, +1 every 3rd after, capped at 5. */
export const bonusForRenewals = (months: number) => {
  const n = Math.floor(months)
  if (!(n >= 1)) return 0
  return Math.min(LOYALTY_MAX_BONUS, 1 + Math.floor((n - 1) / 3))
}

/** Chain month that earns the next bonus instance, or null at the cap. */
export const nextBonusAtRenewal = (months: number): number | null => {
  const bonus = bonusForRenewals(months)
  if (bonus >= LOYALTY_MAX_BONUS) return null
  return bonus === 0 ? 1 : 1 + bonus * 3
}

export type LoyaltyResult = {
  bonus: number
  /**
   * Why: `upfront` (lifetime or annual), `renewals` (monthly chain), `excluded` (more paid instances than the cap), or
   * `none`.
   */
  basis: 'upfront' | 'renewals' | 'excluded' | 'none'
  /** Whole months on the current chain (0 without an active chain). */
  renewals: number
  /** ISO start of the current chain, shifted later by any gap days (month counting starts here). */
  chainStart?: string
}

const isLs = (i: BillingItem) => i.provider === 'lemonsqueezy' && i.quantity > 0

const DAY = 24 * 60 * 60 * 1000

/** Whole calendar months from `a` to `b` (UTC). */
export const wholeMonthsBetween = (a: Date, b: Date) => {
  let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())
  const anchor = new Date(a.getTime())
  anchor.setUTCMonth(anchor.getUTCMonth() + m)
  if (anchor.getTime() > b.getTime()) m -= 1
  return Math.max(0, m)
}

/** `d` plus `n` calendar months (UTC). */
export const addMonths = (d: Date, n: number) => {
  const out = new Date(d.getTime())
  out.setUTCMonth(out.getUTCMonth() + n)
  return out
}

/**
 * The account's current chain: its loyalty-eligible paid items (monthly, annual, lifetime) laid end to end. Returns the
 * effective start (first start plus gap days) when the chain is still active at `now`, else undefined. Items with no
 * start date are skipped.
 */
export const loyaltyChainStart = (items: BillingItem[], now: Date): Date | undefined => {
  const spans = items
    .filter((i) => isLs(i) && (LOYALTY_MONTHLY_SKUS.includes(i.sku) || LOYALTY_UPFRONT_SKUS.includes(i.sku)))
    .map((i) => {
      const start = i.starts_at ? new Date(i.starts_at).getTime() : NaN
      if (isNaN(start)) return undefined
      const ends = i.ends_at ? new Date(i.ends_at).getTime() : NaN
      const end = isBillingItemActive(i, now) ? Infinity : isNaN(ends) ? start : ends
      return { start, end }
    })
    .filter((x): x is { start: number; end: number } => !!x)
    .sort((a, b) => a.start - b.start)

  let chainStart = NaN
  let chainEnd = -Infinity
  let gap = 0
  for (const s of spans) {
    if (isNaN(chainStart) || s.start > chainEnd + LOYALTY_COMEBACK_DAYS * DAY) {
      chainStart = s.start
      gap = 0
    } else if (s.start > chainEnd) {
      gap += s.start - chainEnd
    }
    chainEnd = Math.max(chainEnd, s.end)
  }
  if (isNaN(chainStart) || chainEnd < now.getTime()) return undefined
  return new Date(chainStart + gap)
}

/** More paid instances than the bonus cap: no loyalty bonus at all. */
export const isLoyaltyExcluded = (paidInstances: number) => Math.floor(paidInstances) > LOYALTY_MAX_BONUS

/** True when an active lifetime or annual purchase gives the full bonus. */
export const hasUpfrontLoyalty = (items: BillingItem[], now: Date) =>
  items.some((i) => isLs(i) && LOYALTY_UPFRONT_SKUS.includes(i.sku) && isBillingItemActive(i, now))

/** The account's loyalty bonus. `paidInstances` is `users.subscription_quantity`; above the cap the account is excluded. */
export const loyaltyBonus = (items: BillingItem[], now: Date, paidInstances = 0): LoyaltyResult => {
  if (isLoyaltyExcluded(paidInstances)) return { bonus: 0, basis: 'excluded', renewals: 0 }
  const start = loyaltyChainStart(items, now)
  // A month counts a day early, so a renewal webhook that lands just before the anniversary still sees it.
  const renewals = start ? wholeMonthsBetween(start, new Date(now.getTime() + DAY)) : 0
  const chainStart = start?.toISOString()
  if (hasUpfrontLoyalty(items, now)) return { bonus: LOYALTY_MAX_BONUS, basis: 'upfront', renewals, chainStart }
  const bonus = bonusForRenewals(renewals)
  return { bonus, basis: bonus > 0 ? 'renewals' : 'none', renewals, chainStart }
}

/** The grant note customers see in the dashboard tooltip. */
export const loyaltyNote = (r: LoyaltyResult) =>
  r.basis === 'upfront'
    ? `Loyalty bonus: ${LOYALTY_MAX_BONUS} instances with your annual or lifetime plan`
    : `Loyalty bonus: ${r.renewals} month${r.renewals === 1 ? `` : `s`} subscribed`

/** LS subscription invoice attributes we read. */
export type LsInvoiceAttributes = { billing_reason?: string; status?: string; refunded?: boolean }

/** A paid (not refunded) renewal invoice. Initial and plan-change invoices don't count. */
export const isPaidRenewalInvoice = (a: LsInvoiceAttributes | undefined) =>
  !!a && a.billing_reason === 'renewal' && a.status === 'paid' && !a.refunded

const MONTHS = [`Jan`, `Feb`, `Mar`, `Apr`, `May`, `Jun`, `Jul`, `Aug`, `Sep`, `Oct`, `Nov`, `Dec`]

/** `Jan 13, 2027` (UTC). */
export const formatShortDate = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`

export type LoyaltyEmailVars = { current: string; next: string; max: string; date: string }
export type LoyaltyEmail = { template: string; ref: string; vars: LoyaltyEmailVars }

/** Email templates (message_templates slugs). Editable in the mothership admin. */
export const LOYALTY_TEMPLATES = {
  welcome: 'bonus_welcome',
  welcomeAnnual: 'bonus_welcome_annual',
  welcomeLifetime: 'bonus_welcome_lifetime',
  firstEarned: 'bonus_first_earned',
  earned: 'bonus_earned',
  progress: 'bonus_progress',
} as const

const emailVars = (r: LoyaltyResult): LoyaltyEmailVars => {
  const at = nextBonusAtRenewal(r.renewals)
  const date = r.chainStart && at !== null ? formatShortDate(addMonths(new Date(r.chainStart), at)) : ``
  return {
    current: `${r.bonus}`,
    max: `${LOYALTY_MAX_BONUS}`,
    date,
    next: at === null ? `You're at the max` : date ? `On your ${date} renewal` : `Soon`,
  }
}

/**
 * The email after a paid renewal (Ben, 2026-11-14): fanfare when this chain month earned a bonus (the first one gets
 * its own), progress when it didn't, nothing at 5 or for annual/lifetime. One per chain month (`ref`), however many
 * subscriptions renew.
 */
export const loyaltyRenewalEmail = (r: LoyaltyResult): LoyaltyEmail | null => {
  if (r.basis !== 'renewals' || !r.chainStart || r.renewals < 1) return null
  const ref = `chain:${r.chainStart}:${r.renewals}`
  const earnedNow = bonusForRenewals(r.renewals) > bonusForRenewals(r.renewals - 1)
  if (earnedNow)
    return {
      template: r.bonus === 1 ? LOYALTY_TEMPLATES.firstEarned : LOYALTY_TEMPLATES.earned,
      ref,
      vars: emailVars(r),
    }
  if (r.bonus >= LOYALTY_MAX_BONUS) return null
  return { template: LOYALTY_TEMPLATES.progress, ref, vars: emailVars(r) }
}

/**
 * The email on a new purchase: annual and lifetime get their 5 once, here. A monthly subscription that starts a new
 * chain gets the welcome with the date its first bonus lands; one that joins an existing chain (a second instance, or
 * an account already on annual) gets nothing.
 */
export const loyaltyPurchaseEmail = (r: LoyaltyResult, sku: ProductSku, ref: string): LoyaltyEmail | null => {
  if (r.basis === 'excluded') return null
  if (sku === 'hosting.slot.lifetime') return { template: LOYALTY_TEMPLATES.welcomeLifetime, ref, vars: emailVars(r) }
  if (sku === 'hosting.slot.recurring.year')
    return { template: LOYALTY_TEMPLATES.welcomeAnnual, ref, vars: emailVars(r) }
  if (!LOYALTY_MONTHLY_SKUS.includes(sku) || r.basis === 'upfront' || r.renewals > 0 || !r.chainStart) return null
  return { template: LOYALTY_TEMPLATES.welcome, ref: `chain:${r.chainStart}:0`, vars: emailVars(r) }
}

export const LOYALTY_ENDING_TEMPLATES = {
  cancel: { none: 'bonus_cancelled_none', earning: 'bonus_cancelled_earning', maxed: 'bonus_cancelled_maxed' },
  expired: {
    none: 'bonus_last_chance_none',
    earning: 'bonus_last_chance_earning',
    maxed: 'bonus_last_chance_maxed',
  },
} as const

export type LoyaltyEndingEmail = {
  template: string
  ref: string
  vars: LoyaltyEmailVars & { ends: string; deadline: string; resume_url: string; pricing_url: string }
}

/**
 * The email when a subscription is cancelled (`cancel`, still paid until `endsAt`) or has expired (`expired`). Only
 * when that subscription ending breaks the account's chain: cancelling one of two overlapping subscriptions sends
 * nothing. Which version goes out depends on the bonus at stake: none (no bonus yet), earning (1 to 4) or maxed (5).
 * `items` already reflect the cancel or expiry.
 */
export const loyaltyEndingEmail = (
  kind: 'cancel' | 'expired',
  items: BillingItem[],
  subscriptionId: string,
  endsAtIso: string | undefined,
  now: Date,
  paidInstances: number,
  urls: { resume: string; pricing: string }
): LoyaltyEndingEmail | null => {
  if (!endsAtIso) return null
  const endsAt = new Date(endsAtIso)
  if (isNaN(endsAt.getTime())) return null
  const ended = items.map((i) =>
    i.kind === 'subscription' && i.external_id === subscriptionId ? { ...i, status: 'expired', ends_at: endsAtIso } : i
  )
  // Still covered the day after this subscription ends? Then the chain survives and there's nothing to say.
  if (loyaltyChainStart(ended, new Date(endsAt.getTime() + DAY))) return null
  // The bonus at stake: as it stands now (cancel), or just before it ended (expired).
  const at = kind === 'cancel' ? now : new Date(endsAt.getTime() - 60 * 1000)
  const r = loyaltyBonus(kind === 'cancel' ? items : ended, at, paidInstances)
  if (r.basis === 'excluded') return null
  const level = r.bonus <= 0 ? 'none' : r.bonus >= LOYALTY_MAX_BONUS ? 'maxed' : 'earning'
  return {
    template: LOYALTY_ENDING_TEMPLATES[kind][level],
    ref: `${kind}:${subscriptionId}:${endsAtIso}`,
    vars: {
      ...emailVars(r),
      ends: formatShortDate(endsAt),
      deadline: formatShortDate(new Date(endsAt.getTime() + LOYALTY_COMEBACK_DAYS * DAY)),
      resume_url: urls.resume,
      pricing_url: urls.pricing,
    },
  }
}

/** One-click resume link token: `<subscription id>.<hs256("resume:<id>", secret)>`. */
export const resumeToken = (hs256: (data: string, key: string) => string, secret: string, subscriptionId: string) =>
  `${subscriptionId}.${hs256(`resume:${subscriptionId}`, secret)}`

/** The subscription id from a valid resume token, else undefined. */
export const parseResumeToken = (hs256: (data: string, key: string) => string, secret: string, token: string) => {
  const dot = `${token || ''}`.indexOf('.')
  if (dot <= 0 || !secret) return undefined
  const id = token.slice(0, dot)
  return resumeToken(hs256, secret, id) === token ? id : undefined
}
