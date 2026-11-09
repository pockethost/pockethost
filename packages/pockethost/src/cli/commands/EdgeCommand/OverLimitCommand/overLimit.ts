import {
  APP_URL,
  instanceAllowance,
  logger,
  OVER_LIMIT_GRACE_MS,
  planLapse,
  planOverLimit,
  PocketBase,
  poweredOnInstances,
  type LimitInstance,
  type LimitUser,
} from '@'
import { connectMothership } from '../edgeUtils'
import {
  OVER_LIMIT_POWERED_OFF_TEMPLATE,
  OVER_LIMIT_WARNING_TEMPLATE,
  SUBSCRIPTION_LAPSED_TEMPLATE,
} from './emailTemplates'

type SweepInstance = LimitInstance & { uid: string; subdomain: string }
type SweepUser = LimitUser & { id: string; suspension?: string }

export type OverLimitOptions = {
  /** Write changes and send email. Default is a dry run. */
  apply?: boolean
  email?: boolean
  graceMs?: number
  now?: number
  /** Skip the warning and grace period: power off the extras now. For one-off cleanups. */
  immediate?: boolean
}

export type OverLimitSummary = {
  over: number
  warned: number
  waiting: number
  poweredOffAccounts: number
  poweredOffInstances: number
  cleared: number
  /** Accounts whose plan dropped to 0 with instances still set to run, emailed this run. */
  lapsed: number
  /** Accounts with a lapse marker that have instances in their plan again. */
  lapseCleared: number
  failed: number
}

const plural = (n: number) => `${n} instance${n === 1 ? `` : `s`}`

/** "Nov 9, 2026 14:00 UTC" */
export const fmtDeadline = (d: Date) => `${d.toISOString().slice(0, 16).replace(`T`, ` `)} UTC`

export const instanceList = (instances: { subdomain: string }[]) =>
  instances.map((i) => `<strong>${i.subdomain}</strong>`).join(`, `)

/**
 * Accounts with more powered-on instances than their plan includes (archived ones don't count) get a warning email and
 * `users.over_limit_since`. Once that is older than the grace period, the least recently updated extras are powered off
 * and the owner is emailed again. Accounts back within their plan have the marker cleared. Accounts with no instances
 * in their plan get no grace or power change (the daemon already won't run them); they get one "your instances have
 * stopped" email per lapse, tracked by `users.lapsed_since`. Logs ids and counts only.
 */
export const sweepOverLimit = async ({
  apply = false,
  email = true,
  graceMs = OVER_LIMIT_GRACE_MS,
  now = Date.now(),
  immediate = false,
}: OverLimitOptions = {}): Promise<OverLimitSummary> => {
  const { info, warn, error } = logger().create(`overLimit`)
  const mode = apply ? `APPLY` : `DRY RUN`
  info(`[${mode}] grace=${immediate ? `none (immediate)` : `${graceMs / 3_600_000}h`} email=${email ? `on` : `off`}`)

  const pb = await connectMothership()
  const instances = await pb
    .collection(`instances`)
    .getFullList<SweepInstance>({ fields: `id,uid,subdomain,power,suspension,updated`, batch: 1000 })
  const ownersWithPowerOn = [
    ...new Set(
      poweredOnInstances(instances)
        .map((i) => i.uid)
        .filter(Boolean)
    ),
  ]
  const users = await listUsers(pb, ownersWithPowerOn, warn)
  const byOwner = new Map<string, SweepInstance[]>()
  for (const i of instances) {
    if (!i.uid) continue
    const list = byOwner.get(i.uid) ?? []
    list.push(i)
    byOwner.set(i.uid, list)
  }

  const summary: OverLimitSummary = {
    over: 0,
    warned: 0,
    waiting: 0,
    poweredOffAccounts: 0,
    poweredOffInstances: 0,
    cleared: 0,
    lapsed: 0,
    lapseCleared: 0,
    failed: 0,
  }
  const templates = email && apply ? await ensureTemplates(pb) : null
  const links = { upgradelink: APP_URL(`access`), dashboardlink: APP_URL(`dashboard`) }

  const notify = async (userId: string, templateId: string, vars: Record<string, string>) => {
    if (!templates) return
    await pb.collection(`notifications`).create({
      user: userId,
      channel: `email`,
      message_template: templateId,
      message_template_vars: vars,
      payload: vars,
    })
  }

  for (const user of users) {
    const owned = byOwner.get(user.id) ?? []
    const lapse = user.suspension ? ({ kind: `ok` } as const) : planLapse(user, owned)
    if (lapse.kind !== `ok`) {
      const label = `${user.id} (running ${poweredOnInstances(owned).length})`
      try {
        if (lapse.kind === `notify`) {
          info(`  lapsed: ${label}`)
          summary.lapsed++
          if (apply) {
            await pb.collection(`users`).update(user.id, { lapsed_since: new Date(now).toISOString() })
            await notify(user.id, templates?.lapsed ?? ``, {
              instances: instanceList(poweredOnInstances(owned)),
              ...links,
            })
          }
        } else {
          info(`  back on a plan after lapsing: ${user.id}`)
          summary.lapseCleared++
          if (apply) await pb.collection(`users`).update(user.id, { lapsed_since: `` })
        }
      } catch (e) {
        summary.failed++
        error(`  FAILED (lapse): ${label}`, e)
      }
    }

    const planned = planOverLimit(user, owned, now, graceMs)
    const step =
      immediate && (planned.kind === `start` || planned.kind === `wait`)
        ? ({ kind: `power-off`, excess: planned.excess } as const)
        : planned
    if (step.kind === `ok`) continue
    const running = poweredOnInstances(owned).length
    const allowance = instanceAllowance(user)
    const label = `${user.id} (plan ${allowance}, running ${running})`
    try {
      switch (step.kind) {
        case `clear`:
          info(`  back within plan: ${label}`)
          summary.cleared++
          if (apply) await pb.collection(`users`).update(user.id, { over_limit_since: `` })
          break
        case `start`:
          summary.over++
          summary.warned++
          info(
            `  over: ${label}; will power off ${step.excess.map((i) => i.id).join(`,`)} after ${fmtDeadline(step.deadline)}`
          )
          if (apply) {
            await pb.collection(`users`).update(user.id, { over_limit_since: new Date(now).toISOString() })
            await notify(user.id, templates?.warning ?? ``, {
              allowance: plural(allowance),
              running: `${running}`,
              deadline: fmtDeadline(step.deadline),
              instances: instanceList(step.excess),
              ...links,
            })
          }
          break
        case `wait`:
          summary.over++
          summary.waiting++
          info(`  waiting: ${label} until ${fmtDeadline(step.deadline)}`)
          break
        case `power-off`:
          summary.over++
          info(`  powering off: ${label}: ${step.excess.map((i) => i.id).join(`,`)}`)
          summary.poweredOffAccounts++
          summary.poweredOffInstances += step.excess.length
          if (apply) {
            for (const i of step.excess) await pb.collection(`instances`).update(i.id, { power: false })
            await notify(user.id, templates?.poweredOff ?? ``, {
              allowance: plural(allowance),
              count: `${step.excess.length}`,
              instances: instanceList(step.excess),
              ...links,
            })
          }
          break
      }
    } catch (e) {
      summary.failed++
      error(`  FAILED: ${label}`, e)
    }
  }

  info(
    `[over-limit ${mode}] ${summary.over} accounts over their plan: ${summary.warned} newly warned, ${summary.waiting} in grace, ` +
      `${summary.poweredOffAccounts} powered off (${summary.poweredOffInstances} instances). ${summary.cleared} back within plan. ` +
      `${summary.lapsed} newly lapsed (plan at 0, emailed), ${summary.lapseCleared} back on a plan after lapsing. ${summary.failed} failed`
  )
  return summary
}

/**
 * Users with instances in their plan, anyone still marked over (their plan may have dropped to 0), and owners of
 * powered-on instances whose plan is at 0 (for the lapse email).
 */
const listUsers = async (
  pb: PocketBase,
  ownersWithPowerOn: string[],
  warn: (...args: unknown[]) => void
): Promise<SweepUser[]> => {
  const fields = `id,subscription_quantity,over_limit_since,lapsed_since,suspension`
  const withPlan = await pb
    .collection(`users`)
    .getFullList<SweepUser>({ fields, filter: `subscription_quantity > 0`, batch: 1000 })
  const seen = new Set(withPlan.map((u) => u.id))
  const rest: SweepUser[] = []
  try {
    rest.push(
      ...(await pb
        .collection(`users`)
        .getFullList<SweepUser>({
          fields,
          filter: `over_limit_since != "" && subscription_quantity <= 0`,
          batch: 1000,
        }))
    )
    const pending = ownersWithPowerOn.filter((id) => !seen.has(id))
    for (let i = 0; i < pending.length; i += 50) {
      const chunk = pending.slice(i, i + 50)
      const filter = chunk.map((_, k) => `id = {:id${k}}`).join(` || `)
      const params = Object.fromEntries(chunk.map((id, k) => [`id${k}`, id]))
      rest.push(
        ...(await pb
          .collection(`users`)
          .getFullList<SweepUser>({ fields, filter: pb.filter(`(${filter}) && subscription_quantity <= 0`, params) }))
      )
    }
  } catch (e) {
    // Before the users.over_limit_since / lapsed_since migrations have run.
    warn(`could not list users with no plan (are the migrations applied?): ${(e as Error).message}`)
  }
  for (const u of rest) {
    if (seen.has(u.id)) continue
    seen.add(u.id)
    withPlan.push(u)
  }
  return withPlan
}

/** Template bodies compared without whitespace differences, so an editor round-trip doesn't count as an edit. */
const sameBody = (a: string, b: string) => a.replace(/\s+/g, ` `).trim() === b.replace(/\s+/g, ` `).trim()

const ensureTemplates = async (pb: PocketBase) => {
  type Template = { slug: string; subject: string; body_html: string; previous?: string[] }
  const ensure = async ({ previous = [], ...t }: Template) => {
    const row = await pb
      .collection(`message_templates`)
      .getFirstListItem<{ id: string; body_html?: string }>(pb.filter(`slug = {:slug}`, { slug: t.slug }))
      .catch(() => null)
    if (!row) return (await pb.collection(`message_templates`).create<{ id: string }>(t)).id
    if (previous.some((old) => sameBody(old, row.body_html ?? ``))) {
      await pb.collection(`message_templates`).update(row.id, { body_html: t.body_html })
    }
    return row.id
  }
  return {
    warning: await ensure(OVER_LIMIT_WARNING_TEMPLATE),
    poweredOff: await ensure(OVER_LIMIT_POWERED_OFF_TEMPLATE),
    lapsed: await ensure(SUBSCRIPTION_LAPSED_TEMPLATE),
  }
}
