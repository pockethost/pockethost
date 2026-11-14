import { INSTANCES_ROOT, logger, mkInstanceDataPath, PH_EDGE_ID } from '@'
import { existsSync } from 'fs'
import { connectMothership, dirSizeBytes, formatBytes, mapLimit } from '../edgeUtils'

export type LocalInstance = { id: string; edge?: string }
export type StatsRow = { id: string; instance: string }
export type StatsWrite = { id?: string; instance: string; edge: string; disk_bytes: number; disk_measured: string }

/** Instances this edge serves: placed on it, or with no edge at all (legacy records the Node edge treats as its own). */
export const localInstances = <T extends LocalInstance>(instances: T[], edgeRecordId: string) =>
  instances.filter((i) => !i.edge || i.edge === edgeRecordId)

/**
 * One `instance_stats` row per measured instance (instances without a folder are 0; ones that could not be measured are
 * left out), updating the existing row when there is one.
 */
export const planStatsWrites = (
  local: LocalInstance[],
  sizes: ReadonlyMap<string, number>,
  failed: ReadonlySet<string>,
  existing: StatsRow[],
  edgeRecordId: string,
  measuredAt: string
): StatsWrite[] => {
  const rowByInstance = new Map(existing.map((r) => [r.instance, r.id]))
  return local
    .filter(({ id }) => !failed.has(id))
    .map(({ id }) => ({
      id: rowByInstance.get(id),
      instance: id,
      edge: edgeRecordId,
      disk_bytes: sizes.get(id) ?? 0,
      disk_measured: measuredAt,
    }))
}

export const USAGE_BUCKETS: { label: string; max: number }[] = [
  { label: `0`, max: 0 },
  { label: `< 100 MB`, max: 100 * 1024 ** 2 },
  { label: `100 MB - 1 GB`, max: 1024 ** 3 },
  { label: `1 - 10 GB`, max: 10 * 1024 ** 3 },
  { label: `10 - 25 GB`, max: 25 * 1024 ** 3 },
  { label: `> 25 GB`, max: Infinity },
]

/** How many sizes fall in each bucket (bucket upper bounds are inclusive). */
export const bucketTotals = (totals: Iterable<number>) => {
  const counts = USAGE_BUCKETS.map(({ label }) => ({ label, count: 0, bytes: 0 }))
  for (const bytes of totals) {
    const i = USAGE_BUCKETS.findIndex(({ max }) => bytes <= max)
    counts[i]!.count++
    counts[i]!.bytes += bytes
  }
  return counts
}

export type DiskUsageOptions = {
  dryRun?: boolean
  /** Folders sized at once. */
  concurrency?: number
  /** Mothership writes running at once. */
  writeConcurrency?: number
  /** Instances listed in the dry-run top list. */
  top?: number
}

export type DiskUsageSummary = {
  instances: number
  sized: number
  noLocalData: number
  sizeFailed: number
  written: number
  writeFailed: number
  totalBytes: number
  durationMs: number
}

/**
 * Measure the folder of every instance this edge serves and write it to `instance_stats` (one row per instance). The
 * mothership sums the rows per owner into `users.volume_storage_used` (display only). Logs ids and counts only.
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
  const edge = await pb
    .collection(`edges`)
    .getFirstListItem<{ id: string }>(pb.filter(`edge_id = {:id}`, { id: PH_EDGE_ID() }), { fields: `id` })
  const instances = await pb.collection(`instances`).getFullList<LocalInstance>({ fields: `id,edge`, batch: 1000 })
  if (instances.length === 0) throw new Error(`Mothership returned zero instances; refusing to write`)
  const local = localInstances(instances, edge.id)
  const present = local.filter(({ id }) => existsSync(mkInstanceDataPath(id)))
  if (present.length === 0) throw new Error(`No instance folders found under ${INSTANCES_ROOT()}; refusing to write`)
  info(`${local.length} instances on this edge (${edge.id}), ${present.length} with a folder on disk; sizing...`)

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

  const existing = await pb.collection(`instance_stats`).getFullList<StatsRow>({ fields: `id,instance`, batch: 1000 })
  const writes = planStatsWrites(local, sizes, failed, existing, edge.id, new Date().toISOString())
  const totalBytes = [...sizes.values()].reduce((a, b) => a + b, 0)
  const summary: DiskUsageSummary = {
    instances: local.length,
    sized: sizes.size,
    noLocalData: local.length - present.length,
    sizeFailed: failed.size,
    written: 0,
    writeFailed: 0,
    totalBytes,
    durationMs: 0,
  }

  info(`Instances by disk use:`)
  for (const b of bucketTotals(writes.map((w) => w.disk_bytes))) {
    info(`  ${b.label.padEnd(14)} ${String(b.count).padStart(6)} instances  ${formatBytes(b.bytes)}`)
  }
  if (dryRun) {
    info(`Top ${top} instances:`)
    for (const [id, bytes] of [...sizes].sort((a, b) => b[1] - a[1]).slice(0, top)) {
      info(`  ${id} ${formatBytes(bytes)}`)
    }
    summary.written = writes.length
  } else {
    await mapLimit(writes, writeConcurrency, async ({ id, ...row }) => {
      try {
        if (id) await pb.collection(`instance_stats`).update(id, row)
        else await pb.collection(`instance_stats`).create(row)
        summary.written++
      } catch (e) {
        summary.writeFailed++
        error(`  could not write stats for ${row.instance}: ${e}`)
      }
    })
  }

  summary.durationMs = Date.now() - started
  info(
    `[disk-usage ${mode}] ${summary.sized} instances sized (${summary.noLocalData} without a folder, ${summary.sizeFailed} failed), ` +
      `${formatBytes(totalBytes)} total; ${summary.written} instance_stats rows ${dryRun ? `would be ` : ``}written` +
      `${summary.writeFailed ? `, ${summary.writeFailed} write failures` : ``}; ${(summary.durationMs / 1000).toFixed(1)}s`
  )
  return summary
}
