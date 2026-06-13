import { dirname, resolve } from 'path'
import { existsSync, rmSync } from 'fs'
import { globSync } from 'glob'
import Docker from 'dockerode'
import {
  DOCKER_INSTANCE_IMAGE_NAME,
  INSTANCES_ROOT,
  LoggerService,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_URL,
  MothershipAdminClientService,
  logger,
  mkInstanceDataPath,
} from '@'

export const findInstanceDataDirs = (): string[] => {
  const instancesRoot = resolve(INSTANCES_ROOT())
  const dirs = new Set<string>()

  for (const pbDataPath of globSync(`${instancesRoot}/*/pb_data`, { absolute: true })) {
    dirs.add(resolve(dirname(pbDataPath)))
  }

  return [...dirs]
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

const stopContainersBoundToDataPath = async (dataPath: string) => {
  const { dbg, warn } = logger().create('stopContainersBoundToDataPath')
  const bindPrefix = `${resolve(dataPath)}:`
  const docker = new Docker()
  const containers = await docker.listContainers({ all: true })

  await Promise.all(
    containers.map(async (summary) => {
      if (!summary.Image.startsWith(DOCKER_INSTANCE_IMAGE_NAME())) return

      const container = docker.getContainer(summary.Id)
      const info = await container.inspect()
      const binds = info.HostConfig?.Binds ?? []
      if (!binds.some((bind) => bind.startsWith(bindPrefix))) return

      dbg(`Stopping container ${summary.Id} bound to ${dataPath}`)
      if (info.State.Running) {
        try {
          await container.stop({ signal: 'SIGINT' })
        } catch (e) {
          warn(`SIGINT stop failed for ${summary.Id}, trying SIGKILL`, e)
          await container.stop({ signal: 'SIGKILL' }).catch(() => undefined)
        }
      }
      if (!info.HostConfig?.AutoRemove) {
        await container.remove({ force: true }).catch(() => undefined)
      }
    })
  )
}

export const cleanupOrphanInstanceData = async () => {
  const { dbg, info, warn } = logger().create('cleanupOrphanInstanceData')
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

  if (orphanDirs.length === 0) {
    info(`No orphan instance data directories to remove`)
    return 0
  }

  info(`Removing ${orphanDirs.length} orphan instance data director${orphanDirs.length === 1 ? 'y' : 'ies'}`)

  let removed = 0
  for (const dir of orphanDirs) {
    try {
      dbg(`Removing orphan instance data at ${dir}`)
      await stopContainersBoundToDataPath(dir)
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true })
      }
      removed++
    } catch (e) {
      warn(`Failed to remove orphan instance data at ${dir}`, e)
    }
  }

  info(`Removed ${removed}/${orphanDirs.length} orphan instance data director${orphanDirs.length === 1 ? 'y' : 'ies'}`)
  return removed
}
