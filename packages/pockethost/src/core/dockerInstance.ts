import Docker, { ContainerInspectInfo } from 'dockerode'
import { DOCKER_INSTANCE_IMAGE_NAME } from '../constants'
import { isDockerContainerNotFound } from './phError'

export const instanceContainerName = (instanceId: string) => instanceId

const pocketbaseMountDestination = '/home/pockethost/pocketbase'

export const resolveInstanceIdFromInspect = (info: ContainerInspectInfo): string | undefined => {
  const name = info.Name?.replace(/^\//, '')
  return name || undefined
}

export const getContainerPortBinding = (info: ContainerInspectInfo): number | undefined => {
  const ports = info.NetworkSettings?.Ports?.['8090/tcp']
  const hostPort = ports?.[0]?.HostPort
  if (!hostPort) return undefined
  const portBinding = parseInt(hostPort, 10)
  return Number.isNaN(portBinding) ? undefined : portBinding
}

export const getContainerBoundBinaryPath = (info: ContainerInspectInfo): string | undefined => {
  for (const mount of info.Mounts ?? []) {
    if (mount.Destination === pocketbaseMountDestination) {
      return mount.Source
    }
  }
  return undefined
}

export const containerMatchesBinaryPath = (info: ContainerInspectInfo, expectedBinPath: string) => {
  const bound = getContainerBoundBinaryPath(info)
  return bound === expectedBinPath
}

export type RunningInstanceContainer = {
  instanceId: string
  containerId: string
  inspect: ContainerInspectInfo
}

export const listRunningInstanceContainers = async (): Promise<RunningInstanceContainer[]> => {
  const docker = new Docker()
  const imagePrefix = DOCKER_INSTANCE_IMAGE_NAME()
  const listed = await docker.listContainers({ filters: { status: ['running'] } })
  const results: RunningInstanceContainer[] = []

  for (const summary of listed) {
    if (!summary.Image.startsWith(imagePrefix)) continue

    const inspect = await docker.getContainer(summary.Id).inspect()
    const instanceId = resolveInstanceIdFromInspect(inspect)
    if (!instanceId) continue

    results.push({ instanceId, containerId: summary.Id, inspect })
  }

  return results
}

export const stopInstanceContainer = async (instanceId: string, stopTimeoutSec: number) => {
  const docker = new Docker()
  const container = docker.getContainer(instanceContainerName(instanceId))
  await container.stop({ signal: 'SIGINT', t: stopTimeoutSec }).catch(async (e) => {
    if (isDockerContainerNotFound(e)) return
    await container.kill().catch((killErr) => {
      if (!isDockerContainerNotFound(killErr)) throw killErr
    })
  })
}
