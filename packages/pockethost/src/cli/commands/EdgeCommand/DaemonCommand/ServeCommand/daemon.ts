import {
  DOCKER_INSTANCE_IMAGE_NAME,
  Logger,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_CONTAINER_NAME,
  MOTHERSHIP_URL,
  MothershipAdminClientService,
  PocketbaseService,
  discordAlert,
  isSystemError,
  instanceService,
  proxyService,
  realtimeLog,
  tryFetch,
} from '@'
import Dockerode from 'dockerode'
import { ErrorRequestHandler } from 'express'
import { CronService } from 'src/services/CronService'
import { MothershipMirrorService } from 'src/services/MothershipMirrorService'

export type DaemonOptions = {
  logger: Logger
}

export async function daemon({ logger }: DaemonOptions) {
  const { info, warn } = logger.create(`daemon`)
  info(`Starting`)

  const docker = new Dockerode()

  // Stop all running containers
  info(`Stopping all running Docker containers`)
  const containers = await docker.listContainers({ all: true })
  info(`Found ${containers.length} containers`)
  await Promise.all(
    containers.map(async (container) => {
      if (container.State !== 'running' || !container.Image.startsWith(DOCKER_INSTANCE_IMAGE_NAME())) {
        return
      }
      if (container.Names.some((name) => name === `/${MOTHERSHIP_CONTAINER_NAME}` || name.endsWith(MOTHERSHIP_CONTAINER_NAME))) {
        return
      }
      try {
        info(`Stopping ${container.Id}`)
        await docker.getContainer(container.Id).stop()
        info(`Stopped ${container.Id}`)
      } catch (e) {
        warn(`Failed to stop ${container.Id}, but that's probably OK`, e)
      }
    })
  )

  await PocketbaseService({ logger })

  await tryFetch(MOTHERSHIP_URL(`/api/health`), { logger })

  info(`Serving`)

  /** Launch services */
  await MothershipAdminClientService({
    url: MOTHERSHIP_URL(),
    username: MOTHERSHIP_ADMIN_USERNAME(),
    password: MOTHERSHIP_ADMIN_PASSWORD(),
    logger,
  })

  const { client } = await MothershipAdminClientService()

  await MothershipMirrorService({ client: client.client, logger })

  await CronService({ logger })

  await proxyService({
    coreInternalUrl: MOTHERSHIP_URL(),
    logger,
  })
  await realtimeLog({ logger })
  await instanceService({
    instanceApiCheckIntervalMs: 50,
    instanceApiTimeoutMs: 5000,
    logger,
  })

  const errorHandler: ErrorRequestHandler = (err: Error, req, res, next) => {
    if (isSystemError(err)) {
      discordAlert(err)
    }
    res.status(500).send(err.toString())
  }
  ;(await proxyService()).use(errorHandler)
}
