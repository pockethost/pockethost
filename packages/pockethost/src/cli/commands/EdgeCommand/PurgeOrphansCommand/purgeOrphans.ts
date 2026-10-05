import {
  INSTANCES_QUARANTINE_ROOT,
  INSTANCES_ROOT,
  LoggerService,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_URL,
  MothershipAdminClientService,
  logger,
  mkInstanceDataPath,
} from '@'
import { existsSync, globSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'fs'
import { basename, dirname, join, resolve } from 'path'

const MS_PER_DAY = 86_400_000

export const mkQuarantineName = (instanceId: string, quarantinedAtMs: number) => `${instanceId}.${quarantinedAtMs}`

export const parseQuarantineName = (name: string): { id: string; quarantinedAt: number } | null => {
  const match = /^([a-z0-9]{15})\.(\d+)$/.exec(name)
  const id = match?.[1]
  const quarantinedAtRaw = match?.[2]
  if (!id || quarantinedAtRaw === undefined) return null
  const quarantinedAt = Number(quarantinedAtRaw)
  if (!Number.isFinite(quarantinedAt)) return null
  return { id, quarantinedAt }
}

export const isQuarantineExpired = (quarantinedAtMs: number, nowMs: number, quarantineDays: number) =>
  nowMs - quarantinedAtMs >= quarantineDays * MS_PER_DAY

export const findInstanceDataDirs = (): string[] => {
  const instancesRoot = resolve(INSTANCES_ROOT())
  const dirs = new Set<string>()

  for (const pbDataPath of globSync(`${instancesRoot}/*/pb_data`)) {
    dirs.add(resolve(dirname(pbDataPath)))
  }

  return [...dirs]
}

const dirSizeBytes = (dirPath: string): number => {
  if (!existsSync(dirPath)) return 0

  let total = 0
  for (const entry of readdirSync(dirPath, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue
    total += statSync(join(entry.parentPath, entry.name)).size
  }
  return total
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

const fetchInstanceIds = async (): Promise<string[]> => {
  const { dbg } = logger().create('fetchInstanceIds')
  const { client } = await MothershipAdminClientService({
    url: MOTHERSHIP_URL(),
    username: MOTHERSHIP_ADMIN_USERNAME(),
    password: MOTHERSHIP_ADMIN_PASSWORD(),
    logger: LoggerService(),
  })
  const instances = await client.getInstances()
  dbg(`Fetched ${instances.length} instances from mothership`)
  return instances.map((instance) => instance.id)
}

const listQuarantineEntries = (
  quarantineRoot: string
): { name: string; path: string; parsed: { id: string; quarantinedAt: number } }[] => {
  if (!existsSync(quarantineRoot)) return []

  const entries: { name: string; path: string; parsed: { id: string; quarantinedAt: number } }[] = []
  for (const name of readdirSync(quarantineRoot, { withFileTypes: true })) {
    if (!name.isDirectory()) continue
    const parsed = parseQuarantineName(name.name)
    if (!parsed) continue
    entries.push({ name: name.name, path: join(quarantineRoot, name.name), parsed })
  }
  return entries
}

export type PurgeOrphanInstanceDataOptions = {
  dryRun?: boolean
  quarantineDays?: number
}

export const purgeOrphanInstanceData = async ({
  dryRun = false,
  quarantineDays = 30,
}: PurgeOrphanInstanceDataOptions = {}) => {
  const { dbg, info, warn } = logger().create('purgeOrphanInstanceData')
  const instancesRoot = resolve(INSTANCES_ROOT())
  const quarantineRoot = resolve(INSTANCES_QUARANTINE_ROOT())
  const nowMs = Date.now()

  const instanceIds = await fetchInstanceIds()

  if (instanceIds.length === 0) {
    warn(`Mothership returned zero instances. Aborting without touching disk.`)
    return { quarantined: 0, expired: 0 }
  }

  const validPaths = new Set(instanceIds.map((id) => resolve(mkInstanceDataPath(id))))

  const localDirs = findInstanceDataDirs()
  const orphanDirs = localDirs.filter((dir) => !validPaths.has(dir))
  const keptDirs = localDirs.filter((dir) => validPaths.has(dir))

  info(`Scanning ${instancesRoot} for orphan instance data`)
  info(`Quarantine: ${quarantineRoot} (${quarantineDays}-day retention)`)
  info(`Local: ${localDirs.length} director${localDirs.length === 1 ? 'y' : 'ies'} with pb_data`)
  for (const dir of keptDirs) {
    info(`  keep: ${dir}`)
  }
  for (const dir of orphanDirs) {
    info(`  orphan: ${dir}`)
  }

  info(`Mothership: ${instanceIds.length} instance record${instanceIds.length === 1 ? '' : 's'}`)
  for (const id of instanceIds) {
    dbg(`${id} -> ${mkInstanceDataPath(id)}`)
  }

  let quarantined = 0
  let quarantineBytes = 0
  let expired = 0
  let freedBytes = 0

  if (orphanDirs.length === 0) {
    info(`No orphan instance data directories to quarantine`)
  } else if (dryRun) {
    quarantineBytes = orphanDirs.reduce((total, dir) => total + dirSizeBytes(dir), 0)
    info(
      `Dry run: would quarantine ${orphanDirs.length} orphan instance data director${orphanDirs.length === 1 ? 'y' : 'ies'}`
    )
    for (const dir of orphanDirs) {
      const id = basename(dir)
      const dest = join(quarantineRoot, mkQuarantineName(id, nowMs))
      info(`  would quarantine: ${dir} -> ${dest}`)
    }
  } else {
    mkdirSync(quarantineRoot, { recursive: true })
    info(`Quarantining ${orphanDirs.length} orphan instance data director${orphanDirs.length === 1 ? 'y' : 'ies'}`)

    for (const dir of orphanDirs) {
      const id = basename(dir)
      const dest = join(quarantineRoot, mkQuarantineName(id, nowMs))
      try {
        dbg(`Quarantining orphan instance data at ${dir} -> ${dest}`)
        const bytes = dirSizeBytes(dir)
        if (existsSync(dir)) {
          renameSync(dir, dest)
        }
        quarantined++
        quarantineBytes += bytes
        info(`  quarantined: ${dest}`)
      } catch (e) {
        warn(`Failed to quarantine orphan instance data at ${dir}`, e)
      }
    }
  }

  const quarantineEntries = listQuarantineEntries(quarantineRoot)
  const toExpire = quarantineEntries.filter(({ parsed }) =>
    isQuarantineExpired(parsed.quarantinedAt, nowMs, quarantineDays)
  )

  if (toExpire.length === 0) {
    info(`No quarantine entries past ${quarantineDays}-day retention`)
  } else if (dryRun) {
    info(`Dry run: would expire ${toExpire.length} quarantine entr${toExpire.length === 1 ? 'y' : 'ies'}`)
    for (const { path } of toExpire) {
      info(`  would expire: ${path}`)
    }
    freedBytes = toExpire.reduce((total, { path }) => total + dirSizeBytes(path), 0)
  } else {
    info(
      `Expiring ${toExpire.length} quarantine entr${toExpire.length === 1 ? 'y' : 'ies'} older than ${quarantineDays} days`
    )
    for (const { path } of toExpire) {
      try {
        dbg(`Removing expired quarantine at ${path}`)
        const bytes = dirSizeBytes(path)
        if (existsSync(path)) {
          rmSync(path, { recursive: true, force: true })
        }
        expired++
        freedBytes += bytes
        info(`  expired: ${path}`)
      } catch (e) {
        warn(`Failed to remove expired quarantine at ${path}`, e)
      }
    }
  }

  info(`Summary:`)
  info(`  mothership instances: ${instanceIds.length}`)
  info(`  kept: ${keptDirs.length}`)
  info(`  orphaned: ${orphanDirs.length}`)
  info(`  quarantined: ${quarantined}`)
  info(`  expired: ${expired}`)
  if (dryRun) {
    info(`  would quarantine bytes: ${formatBytes(quarantineBytes)}`)
    info(`  would free from expiry: ${formatBytes(freedBytes)}`)
  } else {
    info(`  quarantined bytes: ${formatBytes(quarantineBytes)}`)
    info(`  freed from expiry: ${formatBytes(freedBytes)}`)
  }

  return { quarantined, expired }
}
