import {
  DISCORD_HEALTH_CHANNEL_URL,
  INSTANCES_ROOT,
  IS_DEV,
  LoggerService,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_DATA_ROOT,
  MOTHERSHIP_PORT,
  MOTHERSHIP_URL,
  MothershipAdminClientService,
  PH_VACUUM_MAX_CONCURRENT,
  getRunningInstanceIds,
  logger,
  stringify,
} from '@'
import Bottleneck from 'bottleneck'
import { execFileSync, execSync } from 'child_process'
import { existsSync, globSync, statSync, statfsSync } from 'fs'
import { basename, dirname, join } from 'path'
import { assertVacuumClientReady, lockInstance, unlockInstance } from './edgeVacuumClient'

const INSTANCE_DB_NAMES = [`data`, `logs`] as const

type VacuumResult = {
  path: string
  instanceId?: string
  beforeBytes: number
  afterBytes: number
  skipped?: string
}

export type VacuumSummary = {
  totalInstances: number
  skipped: number
  instancesVacuumed: number
  storageSavedBytes: number
  mothershipSavedBytes: number
  dryRun: boolean
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

const formatSummaryBytes = (bytes: number): string => {
  if (bytes < 1024 ** 3) return formatBytes(bytes)
  return `${(bytes / 1024 ** 3).toFixed(1)}GB`
}

const fileSizeBytes = (path: string): number => (existsSync(path) ? statSync(path).size : 0)

const freeDiskBytes = (path: string): number | undefined => {
  try {
    const { bavail, bsize } = statfsSync(path)
    return bavail * bsize
  } catch {
    return undefined
  }
}

const execOutput = (value: unknown): string => {
  if (value == null) return ``
  if (typeof value === `string`) return value
  if (Buffer.isBuffer(value)) return value.toString(`utf8`)
  return String(value)
}

const formatExecError = (e: unknown): string => {
  if (!e || typeof e !== `object`) return String(e)
  const err = e as { status?: number; signal?: string | null; stdout?: unknown; stderr?: unknown; message?: string }
  const stderr = execOutput(err.stderr).trim()
  const stdout = execOutput(err.stdout).trim()
  const meta = [err.status != null ? `exit ${err.status}` : undefined, err.signal ? `signal ${err.signal}` : undefined]
    .filter(Boolean)
    .join(` `)
  const lines = [meta, stderr && `stderr: ${stderr}`, stdout && `stdout: ${stdout}`].filter(Boolean)
  return lines.join(` | `) || err.message || String(e)
}

const hasDiskBudget = (dbPath: string): { ok: boolean; detail?: string } => {
  const size = fileSizeBytes(dbPath)
  if (size === 0) return { ok: false, detail: `missing` }

  const free = freeDiskBytes(dbPath)
  if (free === undefined) return { ok: true }
  if (free >= size) return { ok: true }

  return {
    ok: false,
    detail: `need ${formatBytes(size)} free, have ${formatBytes(free)}`,
  }
}

export const vacuumSqliteFile = async (dbPath: string): Promise<VacuumResult> => {
  const beforeBytes = fileSizeBytes(dbPath)
  const disk = hasDiskBudget(dbPath)
  if (!disk.ok) {
    return { path: dbPath, beforeBytes, afterBytes: beforeBytes, skipped: disk.detail }
  }

  execFileSync(`sqlite3`, [dbPath, `PRAGMA wal_checkpoint(TRUNCATE); VACUUM;`], { encoding: `utf8`, stdio: `pipe` })

  return { path: dbPath, beforeBytes, afterBytes: fileSizeBytes(dbPath) }
}

type FleetVacuumStats = {
  totalInstances: number
  skipped: number
  fleetIds: Set<string>
  autoVacuumIds: Set<string>
}

const fetchFleetVacuumStats = async (): Promise<FleetVacuumStats | null> => {
  const { dbg, warn } = logger().create(`fetchFleetVacuumStats`)
  try {
    const { client } = await MothershipAdminClientService({
      url: MOTHERSHIP_URL(),
      username: MOTHERSHIP_ADMIN_USERNAME(),
      password: MOTHERSHIP_ADMIN_PASSWORD(),
      logger: LoggerService(),
    })
    const instances = await client.getInstances()
    const skipped = instances.filter((instance) => instance.autoVacuum === false).length
    const fleetIds = new Set(instances.map((instance) => instance.id))
    const autoVacuumIds = new Set(
      instances.filter((instance) => instance.autoVacuum ?? true).map((instance) => instance.id)
    )
    dbg(`Fleet: ${instances.length} instance(s), ${skipped} opted out, ${autoVacuumIds.size} eligible`)
    return { totalInstances: instances.length, skipped, fleetIds, autoVacuumIds }
  } catch (e) {
    warn(`Could not fetch instance autoVacuum settings from mothership`, e)
    return null
  }
}

const listInstanceDbPaths = (): Array<{ instanceId: string; dbPath: string }> => {
  const paths: Array<{ instanceId: string; dbPath: string }> = []

  for (const pbDataPath of globSync(`${INSTANCES_ROOT(`*`, `pb_data`)}`)) {
    const instanceId = basename(dirname(pbDataPath))
    if (!instanceId) continue

    for (const dbName of INSTANCE_DB_NAMES) {
      const dbPath = join(pbDataPath, `${dbName}.db`)
      if (existsSync(dbPath)) {
        paths.push({ instanceId, dbPath })
      }
    }
  }

  return paths
}

const mothershipDbPaths = (): string[] => {
  const pbData = MOTHERSHIP_DATA_ROOT(`pb_data`)
  return INSTANCE_DB_NAMES.map((name) => join(pbData, `${name}.db`)).filter((path) => existsSync(path))
}

const isMothershipPm2Online = (): boolean => {
  try {
    const list = JSON.parse(execSync(`pm2 jlist`, { encoding: `utf8` })) as Array<{
      name?: string
      pm2_env?: { status?: string }
    }>
    return list.some((entry) => entry.name === `mothership` && entry.pm2_env?.status === `online`)
  } catch {
    return false
  }
}

const isMothershipRunning = (): boolean => {
  if (isMothershipPm2Online()) return true

  try {
    execSync(`curl -sf --max-time 2 http://127.0.0.1:${MOTHERSHIP_PORT()}/api/health`, {
      stdio: `ignore`,
    })
    return true
  } catch {
    return false
  }
}

const stopMothershipPm2 = () => {
  execSync(`pm2 stop mothership`, { stdio: `ignore` })
}

const startMothershipPm2 = () => {
  execSync(`pm2 start mothership`, { stdio: `ignore` })
}

const logVacuumResult = (result: VacuumResult, dryRun: boolean) => {
  const { info, warn } = logger().child(result.path)
  if (result.skipped) {
    warn(`Skipped: ${result.skipped}`)
    return
  }

  const reclaimed = result.beforeBytes - result.afterBytes
  if (dryRun) {
    info(`Would vacuum (${formatBytes(result.beforeBytes)} on disk)`)
    return
  }

  info(
    `Vacuumed ${formatBytes(result.beforeBytes)} → ${formatBytes(result.afterBytes)} (reclaimed ${formatBytes(reclaimed)})`
  )
}

const groupDbPathsByInstance = (dbPaths: Array<{ instanceId: string; dbPath: string }>) => {
  const byInstance = new Map<string, string[]>()
  for (const { instanceId, dbPath } of dbPaths) {
    const paths = byInstance.get(instanceId) ?? []
    paths.push(dbPath)
    byInstance.set(instanceId, paths)
  }
  return byInstance
}

const instanceLatestMtimeMs = (dbPaths: string[]): number =>
  dbPaths.reduce((latest, dbPath) => {
    if (!existsSync(dbPath)) return latest
    return Math.max(latest, statSync(dbPath).mtimeMs)
  }, 0)

const passesHoursBackFilter = (dbPaths: string[], hoursBack?: number): boolean => {
  if (hoursBack == null) return true
  const cutoff = Date.now() - hoursBack * 3_600_000
  return instanceLatestMtimeMs(dbPaths) >= cutoff
}

type InstanceVacuumWork = {
  instanceId: string
  instanceDbPaths: string[]
}

const vacuumOneInstance = async ({
  instanceId,
  instanceDbPaths,
  dryRun,
  warn,
}: {
  instanceId: string
  instanceDbPaths: string[]
  dryRun: boolean
  warn: ReturnType<ReturnType<typeof logger>['create']>['warn']
}): Promise<VacuumResult[]> => {
  const results: VacuumResult[] = []

  if (dryRun) {
    for (const dbPath of instanceDbPaths) {
      const result = {
        path: dbPath,
        instanceId,
        beforeBytes: fileSizeBytes(dbPath),
        afterBytes: fileSizeBytes(dbPath),
      }
      logVacuumResult(result, true)
      results.push(result)
    }
    return results
  }

  const lock = await lockInstance(instanceId)
  if (!lock.granted) {
    warn(`Skipping ${instanceId}: lock denied (${lock.reason})`)
    return results
  }

  try {
    if (getRunningInstanceIds().has(instanceId)) {
      warn(`Skipping ${instanceId}: docker container appeared after lock grant`)
      return results
    }

    for (const dbPath of instanceDbPaths) {
      try {
        const result = { ...(await vacuumSqliteFile(dbPath)), instanceId }
        logVacuumResult(result, false)
        results.push(result)
      } catch (e) {
        warn(`Failed to vacuum ${dbPath}: ${formatExecError(e)}`)
      }
    }
  } finally {
    try {
      await unlockInstance(instanceId, lock.token)
    } catch (e) {
      warn(`Failed to release vacuum lock for ${instanceId}`, e)
    }
  }

  return results
}

export const vacuumIdleInstanceDbs = async ({
  dryRun = false,
  hoursBack,
}: { dryRun?: boolean; hoursBack?: number } = {}) => {
  const { info, warn, debug } = logger().create(`vacuumIdleInstanceDbs`)
  const fleet = await fetchFleetVacuumStats()
  if (!fleet) {
    warn(`Skipping instance vacuum sweep: mothership unavailable`)
    return { results: [], fleet: null }
  }

  if (!dryRun) {
    const ready = await assertVacuumClientReady()
    if (!ready.ok) {
      warn(`Skipping instance vacuum sweep: ${ready.reason}`)
      return { results: [], fleet }
    }
  }

  const { fleetIds, autoVacuumIds } = fleet
  const dbPaths = listInstanceDbPaths()
  const byInstance = groupDbPathsByInstance(dbPaths)

  info(`Found ${byInstance.size} instance(s) with database files`)

  const work: InstanceVacuumWork[] = []

  for (const [instanceId, instanceDbPaths] of byInstance) {
    if (!fleetIds.has(instanceId)) {
      warn(`Skipping ${instanceId}: no mothership record`)
      continue
    }

    if (!autoVacuumIds.has(instanceId)) {
      warn(`Skipping ${instanceId}: auto vacuum disabled`)
      continue
    }

    if (!passesHoursBackFilter(instanceDbPaths, hoursBack)) {
      debug(`Skipping ${instanceId}: db mtime outside --hours-back window`)
      continue
    }

    work.push({ instanceId, instanceDbPaths })
  }

  const maxConcurrent = PH_VACUUM_MAX_CONCURRENT()
  info(`Vacuuming ${work.length} instance(s) with max concurrency ${maxConcurrent}`)

  const limiter = new Bottleneck({ maxConcurrent })
  const resultSets = await Promise.all(
    work.map(({ instanceId, instanceDbPaths }) =>
      limiter.schedule(() => vacuumOneInstance({ instanceId, instanceDbPaths, dryRun, warn }))
    )
  )

  return { results: resultSets.flat(), fleet }
}

export const vacuumMothershipDbs = async ({ dryRun = false } = {}) => {
  const { info, warn } = logger().create(`vacuumMothershipDbs`)
  const dbPaths = mothershipDbPaths()

  if (dbPaths.length === 0) {
    info(`No local Mothership databases found`)
    return []
  }

  info(`Found ${dbPaths.length} Mothership database file(s)`)

  if (dryRun) {
    return dbPaths.map((path) => {
      const result = { path, beforeBytes: fileSizeBytes(path), afterBytes: fileSizeBytes(path) }
      logVacuumResult(result, true)
      return result
    })
  }

  if (isMothershipRunning() && !isMothershipPm2Online()) {
    warn(
      IS_DEV()
        ? `Mothership is running outside PM2 (e.g. dev serve), skipping mothership vacuum`
        : `Mothership is running outside PM2, skipping mothership vacuum`
    )
    return []
  }

  const wasPm2Online = isMothershipPm2Online()
  if (wasPm2Online) {
    info(`Stopping mothership for vacuum window`)
    stopMothershipPm2()
    if (isMothershipRunning()) {
      warn(`Mothership still running after pm2 stop, skipping mothership vacuum`)
      return []
    }
  }

  const results: VacuumResult[] = []

  try {
    for (const dbPath of dbPaths) {
      try {
        const result = await vacuumSqliteFile(dbPath)
        logVacuumResult(result, false)
        results.push(result)
      } catch (e) {
        warn(`Failed to vacuum ${dbPath}: ${formatExecError(e)}`)
      }
    }
  } finally {
    if (wasPm2Online) {
      info(`Restarting mothership`)
      try {
        startMothershipPm2()
      } catch (e) {
        warn(`Failed to restart mothership via pm2`, e)
      }
    }
  }

  return results
}

const reclaimedBytes = (result: VacuumResult) => Math.max(0, result.beforeBytes - result.afterBytes)

const countInstancesVacuumed = (results: VacuumResult[]) => {
  const savedByInstance = new Map<string, number>()

  for (const result of results) {
    if (!result.instanceId || result.skipped) continue
    const saved = reclaimedBytes(result)
    savedByInstance.set(result.instanceId, (savedByInstance.get(result.instanceId) ?? 0) + saved)
  }

  return [...savedByInstance.values()].filter((saved) => saved > 0).length
}

const sumReclaimedBytes = (results: VacuumResult[]) =>
  results.filter((r) => !r.skipped).reduce((total, r) => total + reclaimedBytes(r), 0)

export const buildVacuumSummary = ({
  fleet,
  instanceResults,
  mothershipResults,
  dryRun,
}: {
  fleet: FleetVacuumStats | null
  instanceResults: VacuumResult[]
  mothershipResults: VacuumResult[]
  dryRun: boolean
}): VacuumSummary => {
  const instanceSavedBytes = dryRun ? 0 : sumReclaimedBytes(instanceResults)
  const mothershipSavedBytes = dryRun ? 0 : sumReclaimedBytes(mothershipResults)

  return {
    totalInstances: fleet?.totalInstances ?? 0,
    skipped: fleet?.skipped ?? 0,
    instancesVacuumed: dryRun ? 0 : countInstancesVacuumed(instanceResults),
    storageSavedBytes: instanceSavedBytes + mothershipSavedBytes,
    mothershipSavedBytes,
    dryRun,
  }
}

const formatVacuumSummary = (summary: VacuumSummary) => {
  const lines = [
    summary.dryRun ? `:mag: SQLite vacuum sweep (dry run)` : `:recycle: SQLite vacuum sweep`,
    `===================`,
    `${new Date()}`,
    `Total instances: ${summary.totalInstances}`,
    `Skipped: ${summary.skipped}`,
    `Instances vacuumed: ${summary.instancesVacuumed}`,
    `Storage saved: ${formatSummaryBytes(summary.storageSavedBytes)}`,
  ]

  if (!summary.dryRun && summary.mothershipSavedBytes > 0) {
    lines.push(`Mothership saved: ${formatSummaryBytes(summary.mothershipSavedBytes)}`)
  }

  return lines
}

const splitIntoChunks = (lines: string[], maxChars = 2000): string[] => {
  const chunks: string[] = []
  let currentChunk = ``

  lines.forEach((line) => {
    if (currentChunk.length + line.length + 1 > maxChars) {
      chunks.push(currentChunk)
      currentChunk = ``
    }
    currentChunk += line + `\n`
  })

  if (currentChunk) chunks.push(currentChunk)
  return chunks
}

export const postVacuumSummaryToDiscord = async (summary: VacuumSummary) => {
  const { info, warn } = logger().create(`postVacuumSummaryToDiscord`)
  const discordUrl = DISCORD_HEALTH_CHANNEL_URL()

  if (!discordUrl) {
    info(`Discord summary suppressed: DISCORD_HEALTH_CHANNEL_URL not set`)
    return
  }

  const limiter = new Bottleneck({ maxConcurrent: 1 })
  const lines = formatVacuumSummary(summary)

  await Promise.all(
    splitIntoChunks(lines).map((content) =>
      limiter.schedule(() =>
        fetch(discordUrl, {
          method: `POST`,
          body: stringify({ content }),
          headers: { 'content-type': `application/json` },
        }).then((res) => {
          if (res.status !== 204) {
            throw new Error(`${res.status} ${res.statusText}`)
          }
        })
      )
    )
  )

  info(`Posted vacuum summary to Discord`)
}

export const vacuumAll = async ({ dryRun = false, hoursBack }: { dryRun?: boolean; hoursBack?: number } = {}) => {
  const { info } = logger().create(`vacuumAll`)
  info(
    `Starting SQLite vacuum sweep${dryRun ? ` (dry run)` : ``}${hoursBack != null ? ` (--hours-back=${hoursBack})` : ``}`
  )

  const { results: instanceResults, fleet } = await vacuumIdleInstanceDbs({ dryRun, hoursBack })
  const mothershipResults = await vacuumMothershipDbs({ dryRun })
  const summary = buildVacuumSummary({ fleet, instanceResults, mothershipResults, dryRun })

  const summaryLines = formatVacuumSummary(summary)
  console.log(summaryLines.join(`\n`))

  if (!dryRun) {
    await postVacuumSummaryToDiscord(summary).catch((e) => {
      logger().create(`vacuumAll`).warn(`Failed to post vacuum summary to Discord`, e)
    })
  }

  return { instanceResults, mothershipResults, summary }
}
