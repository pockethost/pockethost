/**
 * Instance limits. An account may own as many instances as its plan includes (`users.subscription_quantity`), and all
 * of them may run. Archived instances don't count. Shared by the mothership (create / power-on checks, bundled into the
 * JSVM, so no Node imports here) and the edge over-limit sweep.
 */

/** Archived instances carry this prefix in `instances.suspension`. */
export const ARCHIVED_SUSPENSION_PREFIX = `Archived:`

export const isArchivedSuspension = (suspension: string | undefined | null) =>
  !!suspension && suspension.startsWith(ARCHIVED_SUSPENSION_PREFIX)

/** How long an account may stay over its limit before the sweep powers off the extra instances. */
export const OVER_LIMIT_GRACE_MS = 24 * 60 * 60 * 1000

export type LimitInstance = {
  id: string
  subdomain?: string
  power: boolean
  suspension?: string | null
  updated: string
}

export type LimitUser = {
  subscription_quantity?: number | null
  /** When the sweep first saw this account over its limit. Empty when it isn't. */
  over_limit_since?: string | null
  /** When the sweep emailed this account that its subscription ended and its instances stopped. Empty otherwise. */
  lapsed_since?: string | null
}

export const instanceAllowance = (user: LimitUser) => Math.max(0, Math.floor(user.subscription_quantity ?? 0))

/** Instances that count toward the limit: everything except archived ones. */
export const countedInstances = <T extends LimitInstance>(owned: T[]) =>
  owned.filter((i) => !isArchivedSuspension(i.suspension))

/** Counted instances that are powered on. */
export const poweredOnInstances = <T extends LimitInstance>(owned: T[]) =>
  countedInstances(owned).filter((i) => i.power)

const plural = (n: number) => `${n} instance${n === 1 ? `` : `s`}`

/** Error message when the account can't create another instance, or null when it can. */
export const createLimitError = (owned: LimitInstance[], allowance: number): string | null => {
  const count = countedInstances(owned).length
  if (count < allowance) return null
  if (allowance === 0)
    return `Your account doesn't include any instances yet. Add an instance to your plan to create one.`
  return `Your plan includes ${plural(allowance)} and you have ${count}. Delete or archive one, or add instances to your plan.`
}

/**
 * Error message when `instanceId` can't be powered on, or null when it can. Only the other powered-on instances are
 * counted, so re-saving an instance that is already on never fails.
 */
export const powerOnLimitError = (instanceId: string, owned: LimitInstance[], allowance: number): string | null => {
  const othersOn = poweredOnInstances(owned).filter((i) => i.id !== instanceId).length
  if (othersOn < allowance) return null
  if (allowance === 0) return `Your account doesn't include any instances yet. Add an instance to your plan to run one.`
  return `Your plan includes ${plural(allowance)} and ${othersOn} ${othersOn === 1 ? `is` : `are`} already running. Power one off, or add instances to your plan.`
}

const updatedMs = (i: LimitInstance) => {
  const ms = Date.parse(i.updated.replace(` `, `T`))
  return Number.isFinite(ms) ? ms : 0
}

/** Powered-on instances beyond the allowance, least recently updated first. */
export const pickExcessInstances = <T extends LimitInstance>(owned: T[], allowance: number): T[] => {
  const on = poweredOnInstances(owned)
  const extra = on.length - allowance
  if (extra <= 0) return []
  return [...on].sort((a, b) => updatedMs(a) - updatedMs(b) || a.id.localeCompare(b.id)).slice(0, extra)
}

export type OverLimitStep<T extends LimitInstance> =
  /** Within the limit and nothing recorded. */
  | { kind: 'ok' }
  /** Back within the limit: clear `over_limit_since`. */
  | { kind: 'clear' }
  /** Newly over: record `over_limit_since = now` and warn the owner. `excess` is what will be powered off. */
  | { kind: 'start'; excess: T[]; deadline: Date }
  /** Over, still inside the grace period. */
  | { kind: 'wait'; excess: T[]; deadline: Date }
  /** Over and the grace period has passed: power off `excess`. */
  | { kind: 'power-off'; excess: T[] }

const parseSince = (since: string | null | undefined) => {
  if (!since) return null
  const ms = Date.parse(since.replace(` `, `T`))
  return Number.isFinite(ms) ? ms : null
}

/**
 * What the over-limit sweep should do for one account. Accounts with no instances in their plan are left alone: the
 * daemon already refuses to run their instances, and stale ones are archived by `edge archive stale`.
 */
export const planOverLimit = <T extends LimitInstance>(
  user: LimitUser,
  owned: T[],
  nowMs: number,
  graceMs = OVER_LIMIT_GRACE_MS
): OverLimitStep<T> => {
  const allowance = instanceAllowance(user)
  const since = parseSince(user.over_limit_since)
  const excess = allowance === 0 ? [] : pickExcessInstances(owned, allowance)
  if (excess.length === 0) return since === null ? { kind: 'ok' } : { kind: 'clear' }
  if (since === null) return { kind: 'start', excess, deadline: new Date(nowMs + graceMs) }
  if (nowMs - since < graceMs) return { kind: 'wait', excess, deadline: new Date(since + graceMs) }
  return { kind: 'power-off', excess }
}

export type LapseStep =
  /** Nothing to do. */
  | { kind: 'ok' }
  /** The plan just dropped to 0 with instances still set to run: record `lapsed_since` and tell the owner. */
  | { kind: 'notify' }
  /** The account has instances in its plan again: clear `lapsed_since`. */
  | { kind: 'clear' }

/**
 * The other half of a plan going down: no instances left in the plan at all. There's nothing to choose, so there's no
 * grace period and no power change. The daemon already refuses to run anything on the account, and every instance comes
 * back as-is when the owner subscribes again. The sweep only sends one email per lapse.
 */
export const planLapse = (user: LimitUser, owned: LimitInstance[]): LapseStep => {
  const allowance = instanceAllowance(user)
  const marked = parseSince(user.lapsed_since) !== null
  if (allowance > 0) return marked ? { kind: 'clear' } : { kind: 'ok' }
  if (marked || poweredOnInstances(owned).length === 0) return { kind: 'ok' }
  return { kind: 'notify' }
}
