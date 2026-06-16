import {
  INSTANCES_ROOT,
  LoggerService,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_URL,
  MothershipAdminClientService,
  logger,
  mkInstanceDataPath,
} from '@'
import { existsSync, globSync, readdirSync, rmSync, statSync } from 'fs'
import { dirname, join, resolve } from 'path'

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

export const purgeOrphanInstanceData = async ({ dryRun = false } = {}) => {
  const { dbg, info, warn } = logger().create('purgeOrphanInstanceData')
  const instancesRoot = resolve(INSTANCES_ROOT())
  const instanceIds = await fetchInstanceIds()
  const validPaths = new Set(instanceIds.map((id) => resolve(mkInstanceDataPath(id))))

  const localDirs = findInstanceDataDirs()
  const orphanDirs = localDirs.filter((dir) => !validPaths.has(dir))
  const keptDirs = localDirs.filter((dir) => validPaths.has(dir))

  info(`Scanning ${instancesRoot} for orphan instance data`)
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

  let removed = 0
  let freedBytes = 0
  let orphanBytes = 0

  if (orphanDirs.length === 0) {
    info(`No orphan instance data directories to remove`)
  } else if (dryRun) {
    orphanBytes = orphanDirs.reduce((total, dir) => total + dirSizeBytes(dir), 0)
    info(
      `Dry run: would remove ${orphanDirs.length} orphan instance data director${orphanDirs.length === 1 ? 'y' : 'ies'}`
    )
    for (const dir of orphanDirs) {
      info(`  would remove: ${dir}`)
    }
  } else {
    info(`Removing ${orphanDirs.length} orphan instance data director${orphanDirs.length === 1 ? 'y' : 'ies'}`)

    for (const dir of orphanDirs) {
      try {
        dbg(`Removing orphan instance data at ${dir}`)
        const bytes = dirSizeBytes(dir)
        if (existsSync(dir)) {
          rmSync(dir, { recursive: true, force: true })
        }
        removed++
        freedBytes += bytes
      } catch (e) {
        warn(`Failed to remove orphan instance data at ${dir}`, e)
      }
    }
  }

  info(`Summary:`)
  info(`  mothership instances: ${instanceIds.length}`)
  info(`  kept: ${keptDirs.length}`)
  info(`  orphaned: ${orphanDirs.length}`)
  info(`  removed: ${removed}`)
  if (dryRun) {
    info(`  would free: ${formatBytes(orphanBytes)}`)
  } else {
    info(`  freed: ${formatBytes(freedBytes)}`)
  }

  return removed
}
