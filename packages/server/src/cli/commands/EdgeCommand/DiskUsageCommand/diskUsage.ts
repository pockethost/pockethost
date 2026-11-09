import { INSTANCES_ROOT, logger, mkInstanceDataPath } from '@'
import { existsSync } from 'fs'
import { connectMothership, dirSizeBytes, formatBytes, mapLimit } from '../edgeUtils'

export type InstanceOwner = { id: string; uid: string }
export type UserStorage = { id: string; volume_storage_used?: number | null; object_storage_used?: number | null }
export type UsageUpdate = { id: string; volume_storage_used: number; object_storage_used: number; previous: number }

/**
 * Per-user totals from per-instance sizes. Instances with no folder on disk count as 0 (archived, never started, or
 * hosted elsewhere). Owners of an instance that could not be measured land in `unknown` so their stored value is left
 * alone rather than undercounted.
 */
export const sumByUser = (
  instances: InstanceOwner[],
  sizes: ReadonlyMap<string, number>,
  failed: ReadonlySet<string> = new Set()
) => {
  const totals = new Map<string, number>()
  const unknown = new Set<string>()
  for (const { id, uid } of instances) {
    if (!uid) continue
    if (failed.has(id)) unknown.add(uid)
    totals.set(uid, (totals.get(uid) ?? 0) + (sizes.get(id) ?? 0))
  }
  for (const uid of unknown) totals.delete(uid)
  return { totals, unknown }
}

/**
 * Users whose stored disk storage differs from the measured total. Everything on disk is volume storage; object storage
 * is 0 because cold-storage backups, archives and customer S3 don't count. Users with no measured instances get 0.
 * Users in `unknown` are skipped.
 */
export const planUsageUpdates = (
  users: UserStorage[],
  totals: ReadonlyMap<string, number>,
  unknown: ReadonlySet<string> = new Set()
): UsageUpdate[] => {
  const updates: UsageUpdate[] = []
  for (const user of users) {
    if (unknown.has(user.id)) continue
    const volume = totals.get(user.id) ?? 0
    const previous = user.volume_storage_used ?? 0
    if (previous === volume && (user.object_storage_used ?? 0) === 0 && user.volume_storage_used != null) continue
    updates.push({ id: user.id, volume_storage_used: volume, object_storage_used: 0, previous })
  }
  return updates
}

export const USAGE_BUCKETS: { label: string; max: number }[] = [
  { label: `0`, max: 0 },
  { label: `< 100 MB`, max: 100 * 1024 ** 2 },
  { label: `100 MB - 1 GB`, max: 1024 ** 3 },
  { label: `1 - 10 GB`, max: 10 * 1024 ** 3 },
  { label: `10 - 25 GB`, max: 25 * 1024 ** 3 },
  { label: `> 25 GB`, max: Infinity },
]

/** How many users fall in each size bucket (bucket upper bounds are inclusive). */
export const bucketTotals = (totals: Iterable<number>) => {
  const counts = USAGE_BUCKETS.map(({ label }) => ({ label, users: 0, bytes: 0 }))
  for (const bytes of totals) {
    const i = USAGE_BUCKETS.findIndex(({ max }) => bytes <= max)
    counts[i]!.users++
    counts[i]!.bytes += bytes
  }
  return counts
}

export type DiskUsageOptions = {
  dryRun?: boolean
  /** Du processes running at once. */
  concurrency?: number
  /** Mothership writes running at once. */
  writeConcurrency?: number
  /** Users / instances listed in the dry-run top lists. */
  top?: number
}

export type DiskUsageSummary = {
  instances: number
  sized: number
  noLocalData: number
  sizeFailed: number
  users: number
  usersUpdated: number
  usersSkipped: number
  updateFailed: number
  totalBytes: number
  durationMs: number
}

/**
 * Measure every instance folder on this edge and write each owner's total to `users.volume_storage_used` (display only;
 * nothing is enforced). Logs ids and counts only, never emails.
 */
export const measureDiskUsage = async ({
  dryRun = false,
  concurrency = 4,
  writeConcurrency = 8,
  top = 10,
}: DiskUsageOptions = {}): Promise<DiskUsageSummary> => {
  const { info, warn, error } = logger().create(`diskUsage`)
  const started = Date.now()
  const mode = dryRun ? `DRY RUN` : `APPLY`
  info(`[${mode}] root=${INSTANCES_ROOT()} concurrency=${concurrency}`)

  if (!existsSync(INSTANCES_ROOT())) throw new Error(`${INSTANCES_ROOT()} does not exist; is the data volume mounted?`)

  const pb = await connectMothership()
  const instances = await pb.collection(`instances`).getFullList<InstanceOwner>({ fields: `id,uid`, batch: 1000 })
  if (instances.length === 0) throw new Error(`Mothership returned zero instances; refusing to zero everyone's usage`)

  const present = instances.filter(({ id }) => existsSync(mkInstanceDataPath(id)))
  if (present.length === 0) throw new Error(`No instance folders found under ${INSTANCES_ROOT()}; refusing to write`)
  info(`${instances.length} instances in the mothership, ${present.length} with a folder on disk; sizing...`)

  const sizes = new Map<string, number>()
  const failed = new Set<string>()
  let done = 0
  await mapLimit(present, concurrency, async ({ id }) => {
    try {
      sizes.set(id, await dirSizeBytes(mkInstanceDataPath(id)))
    } catch (e) {
      failed.add(id)
      warn(`  could not size ${id}: ${e}`)
    }
    if (++done % 1000 === 0) info(`  sized ${done}/${present.length}`)
  })

  const { totals, unknown } = sumByUser(instances, sizes, failed)
  const users = await pb.collection(`users`).getFullList<UserStorage>({
    fields: `id,volume_storage_used,object_storage_used`,
    batch: 1000,
  })
  const updates = planUsageUpdates(users, totals, unknown)
  const totalBytes = [...sizes.values()].reduce((a, b) => a + b, 0)

  const summary: DiskUsageSummary = {
    instances: instances.length,
    sized: sizes.size,
    noLocalData: instances.length - present.length,
    sizeFailed: failed.size,
    users: users.length,
    usersUpdated: 0,
    usersSkipped: unknown.size,
    updateFailed: 0,
    totalBytes,
    durationMs: 0,
  }

  const userTotals = users.filter((u) => !unknown.has(u.id)).map((u) => totals.get(u.id) ?? 0)
  info(`Users by disk storage:`)
  for (const b of bucketTotals(userTotals)) {
    info(`  ${b.label.padEnd(14)} ${String(b.users).padStart(6)} users  ${formatBytes(b.bytes)}`)
  }
  if (dryRun) {
    info(`Top ${top} users:`)
    for (const [uid, bytes] of [...totals].sort((a, b) => b[1] - a[1]).slice(0, top)) {
      info(`  ${uid} ${formatBytes(bytes)}`)
    }
    info(`Top ${top} instances:`)
    for (const [id, bytes] of [...sizes].sort((a, b) => b[1] - a[1]).slice(0, top)) {
      info(`  ${id} ${formatBytes(bytes)}`)
    }
    summary.usersUpdated = updates.length
  } else {
    await mapLimit(updates, writeConcurrency, async ({ id, volume_storage_used, object_storage_used }) => {
      try {
        await pb.collection(`users`).update(id, { volume_storage_used, object_storage_used })
        summary.usersUpdated++
      } catch (e) {
        summary.updateFailed++
        error(`  could not update user ${id}: ${e}`)
      }
    })
  }

  summary.durationMs = Date.now() - started
  info(
    `[disk-usage ${mode}] ${summary.sized} instances sized (${summary.noLocalData} without a folder, ${summary.sizeFailed} failed), ` +
      `${formatBytes(totalBytes)} total; ${summary.usersUpdated} of ${summary.users} users ${dryRun ? `would be ` : ``}updated` +
      `${summary.updateFailed ? `, ${summary.updateFailed} update failures` : ``}` +
      `${summary.usersSkipped ? `, ${summary.usersSkipped} skipped (unmeasured instance)` : ``}; ` +
      `${(summary.durationMs / 1000).toFixed(1)}s`
  )
  return summary
}
