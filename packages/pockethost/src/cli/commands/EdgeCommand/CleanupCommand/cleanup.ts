import { basename, dirname, resolve } from 'path'
import { existsSync, rmSync } from 'fs'
import { globSync } from 'glob'
import Docker from 'dockerode'
import {
  DATA_ROOT,
  DOCKER_INSTANCE_IMAGE_NAME,
  LoggerService,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_NAME,
  MOTHERSHIP_URL,
  MothershipAdminClientService,
  VOLUME_MOUNT_POINT,
  logger,
  mkInstanceDataPath,
} from '@'

type InstanceDataPath = {
  id: string
  volume: string
}

const reservedTopLevelNames = () =>
  new Set([basename(VOLUME_MOUNT_POINT()), MOTHERSHIP_NAME(), 'cloud-storage-mount'])

export const findInstanceDataDirs = (dataRoot: string): string[] => {
  const dataRootResolved = resolve(dataRoot)
  const reserved = reservedTopLevelNames()
  const dirs = new Set<string>()

  for (const pbDataPath of globSync(`${dataRootResolved}/**/pb_data`, { nodir: true, absolute: true })) {
    const instanceDir = resolve(dirname(pbDataPath))
    if (!instanceDir.startsWith(dataRootResolved)) continue

    const rel = instanceDir.slice(dataRootResolved.length).replace(/^\/+/, '')
    const topLevel = rel.split('/')[0]
    if (!topLevel || reserved.has(topLevel)) continue

    dirs.add(instanceDir)
  }

  return [...dirs]
}

const fetchInstanceDataPaths = async (): Promise<InstanceDataPath[]> => {
  const { dbg } = logger().create('fetchInstanceDataPaths')
  const api = await MothershipAdminClientService({
    url: MOTHERSHIP_URL(),
    username: MOTHERSHIP_ADMIN_USERNAME(),
    password: MOTHERSHIP_ADMIN_PASSWORD(),
    logger: LoggerService(),
  })
  const res = await api.client.client.send('/api/instances/data-paths', { method: 'GET' })
  dbg(`Fetched ${res.instances?.length ?? 0} instance data paths from mothership`)
  return (res.instances ?? []) as InstanceDataPath[]
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
  const instances = await fetchInstanceDataPaths()
  const validPaths = new Set(
    instances.map((instance) => resolve(mkInstanceDataPath(instance.volume, instance.id)))
  )

  const orphanDirs = findInstanceDataDirs(DATA_ROOT()).filter((dir) => !validPaths.has(dir))
  if (orphanDirs.length === 0) {
    dbg(`No orphan instance data directories found`)
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
