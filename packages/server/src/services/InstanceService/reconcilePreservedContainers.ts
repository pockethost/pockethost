import {
  containerMatchesBinaryPath,
  InstanceFields,
  InstanceId,
  Logger,
  PH_CONTAINER_STOP_TIMEOUT_SEC,
  PocketBaseBinaryService,
  PocketbaseServiceApi,
  stopInstanceContainer,
} from '@'
import { listRunningInstanceContainers, type RunningInstanceContainer } from '../../core/dockerInstance'

type ReconcilePreservedContainersConfig = {
  getInstance: (instanceId: InstanceId) => Promise<InstanceFields | undefined>
  pbService: PocketbaseServiceApi
  adoptInstance: (instance: InstanceFields) => Promise<unknown>
  isAlreadyManaged: (instanceId: InstanceId) => boolean
  logger: Logger
}

const shouldStopContainer = (
  entry: RunningInstanceContainer,
  instance: InstanceFields | undefined,
  expectedBinPath: string | undefined
): string | undefined => {
  if (!instance) return 'orphan (not in mothership)'
  if (!instance.power) return 'power off'
  if (expectedBinPath && !containerMatchesBinaryPath(entry.inspect, expectedBinPath)) {
    return 'version mismatch'
  }
  return undefined
}

export const reconcilePreservedContainers = async ({
  getInstance,
  pbService,
  adoptInstance,
  isAlreadyManaged,
  logger,
}: ReconcilePreservedContainersConfig) => {
  const { dbg, info, warn } = logger.create('reconcile')
  const pb = PocketBaseBinaryService()
  const running = await listRunningInstanceContainers().catch((e) => {
    warn(`Could not list running instance containers`, { e })
    return [] as RunningInstanceContainer[]
  })

  info(`Found ${running.length} running instance containers`)

  const stop = async (instanceId: InstanceId, reason: string) => {
    info(`Stopping ${instanceId}: ${reason}`)
    try {
      await pbService.stop(instanceId)
    } catch (e) {
      warn(`Failed to stop ${instanceId} via PocketbaseService`, { e })
      await stopInstanceContainer(instanceId, PH_CONTAINER_STOP_TIMEOUT_SEC()).catch((stopErr) => {
        warn(`Failed to stop ${instanceId} directly`, { stopErr })
      })
    }
  }

  for (const entry of running) {
    const instance = await getInstance(entry.instanceId)
    let expectedBinPath: string | undefined
    if (instance) {
      try {
        const realVersion = pb.maxSatisfyingVersion(instance.version)
        expectedBinPath = realVersion ? pb.getBinaryPath(realVersion) : undefined
      } catch {
        expectedBinPath = undefined
      }
    }

    const stopReason = shouldStopContainer(entry, instance, expectedBinPath)
    if (stopReason) {
      await stop(entry.instanceId, stopReason)
      continue
    }

    if (!instance) continue

    if (isAlreadyManaged(entry.instanceId)) {
      dbg(`Skipping adoption for ${entry.instanceId}, already managed`)
      continue
    }

    dbg(`Adopting preserved container for ${entry.instanceId}`)
    try {
      await adoptInstance(instance)
      info(`Adopted ${entry.instanceId}`)
    } catch (e) {
      warn(`Failed to adopt ${entry.instanceId}, stopping container`, { e })
      await stop(entry.instanceId, 'adoption failed')
    }
  }
}
