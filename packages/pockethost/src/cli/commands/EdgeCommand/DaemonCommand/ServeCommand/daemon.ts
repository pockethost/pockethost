import Dockerode from 'dockerode'
import { ErrorRequestHandler } from 'express'
import { LoggerService } from '../../../../../common'
import {
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_URL,
  discordAlert,
  tryFetch,
} from '../../../../../core'
import {
  DOCKER_INSTANCE_IMAGE_NAME,
  MothershipAdminClientService,
  PocketbaseService,
  instanceService,
  proxyService,
  realtimeLog,
} from '../../../../../services'

export async function daemon() {
  const logger = LoggerService().create(`EdgeDaemonCommand`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  const docker = new Dockerode()

  // Stop all running containers
  info(`Stopping all running Docker containers`)
  const containers = await docker.listContainers({ all: true })
  await Promise.all(
    containers.map(async (container) => {
      if (
        container.State === 'running' &&
        container.Image === DOCKER_INSTANCE_IMAGE_NAME
      ) {
        try {
          await docker.getContainer(container.Id).stop()
          info(`Stopped ${container.Id}`)
        } catch (e) {
          warn(`Failed to stop ${container.Id}, but that's probably OK`, e)
        }
      }
    }),
  )

  await PocketbaseService({})

  await tryFetch(MOTHERSHIP_URL(`/api/health`), {})

  info(`Serving`)

  /** Launch services */
  await MothershipAdminClientService({
    url: MOTHERSHIP_URL(),
    username: MOTHERSHIP_ADMIN_USERNAME(),
    password: MOTHERSHIP_ADMIN_PASSWORD(),
  })

  await proxyService({
    coreInternalUrl: MOTHERSHIP_URL(),
  })
  await realtimeLog({})
  await instanceService({
    instanceApiCheckIntervalMs: 50,
    instanceApiTimeoutMs: 5000,
  })

  const errorHandler: ErrorRequestHandler = (err: Error, req, res, next) => {
    console.log(`###error`, err)
    discordAlert(err)
    res.status(500).send(err.toString())
  }
  ;(await proxyService()).use(errorHandler)
}
