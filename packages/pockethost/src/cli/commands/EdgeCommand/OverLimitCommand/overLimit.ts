import {
  APP_URL,
  instanceAllowance,
  logger,
  OVER_LIMIT_GRACE_MS,
  planOverLimit,
  PocketBase,
  poweredOnInstances,
  type LimitInstance,
  type LimitUser,
} from '@'
import { connectMothership } from '../edgeUtils'
import { OVER_LIMIT_POWERED_OFF_TEMPLATE, OVER_LIMIT_WARNING_TEMPLATE } from './emailTemplates'

type SweepInstance = LimitInstance & { uid: string; subdomain: string }
type SweepUser = LimitUser & { id: string }

export type OverLimitOptions = {
  /** Write changes and send email. Default is a dry run. */
  apply?: boolean
  email?: boolean
  graceMs?: number
  now?: number
}

export type OverLimitSummary = {
  over: number
  warned: number
  waiting: number
  poweredOffAccounts: number
  poweredOffInstances: number
  cleared: number
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
 * in their plan are left alone (the daemon already won't run them). Logs ids and counts only.
 */
export const sweepOverLimit = async ({
  apply = false,
  email = true,
  graceMs = OVER_LIMIT_GRACE_MS,
  now = Date.now(),
}: OverLimitOptions = {}): Promise<OverLimitSummary> => {
  const { info, warn, error } = logger().create(`overLimit`)
  const mode = apply ? `APPLY` : `DRY RUN`
  info(`[${mode}] grace=${graceMs / 3_600_000}h email=${email ? `on` : `off`}`)

  const pb = await connectMothership()
  const instances = await pb
    .collection(`instances`)
    .getFullList<SweepInstance>({ fields: `id,uid,subdomain,power,suspension,updated`, batch: 1000 })
  const users = await listUsers(pb, warn)
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
    const step = planOverLimit(user, owned, now, graceMs)
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
      `${summary.poweredOffAccounts} powered off (${summary.poweredOffInstances} instances). ${summary.cleared} back within plan, ${summary.failed} failed`
  )
  return summary
}

/** Users with instances in their plan, plus anyone still marked over (their plan may have dropped to 0). */
const listUsers = async (pb: PocketBase, warn: (...args: unknown[]) => void): Promise<SweepUser[]> => {
  const fields = `id,subscription_quantity,over_limit_since`
  const withPlan = await pb
    .collection(`users`)
    .getFullList<SweepUser>({ fields, filter: `subscription_quantity > 0`, batch: 1000 })
  let marked: SweepUser[] = []
  try {
    marked = await pb
      .collection(`users`)
      .getFullList<SweepUser>({ fields, filter: `over_limit_since != "" && subscription_quantity <= 0`, batch: 1000 })
  } catch (e) {
    // Before the users.over_limit_since migration has run.
    warn(`could not list marked users (is the over_limit_since migration applied?): ${(e as Error).message}`)
  }
  return [...withPlan, ...marked]
}

const ensureTemplates = async (pb: PocketBase) => {
  const ensure = async (t: { slug: string }) => {
    try {
      return (await pb.collection(`message_templates`).getFirstListItem<{ id: string }>(`slug = "${t.slug}"`)).id
    } catch {
      return (await pb.collection(`message_templates`).create<{ id: string }>(t)).id
    }
  }
  return {
    warning: await ensure(OVER_LIMIT_WARNING_TEMPLATE),
    poweredOff: await ensure(OVER_LIMIT_POWERED_OFF_TEMPLATE),
  }
}
