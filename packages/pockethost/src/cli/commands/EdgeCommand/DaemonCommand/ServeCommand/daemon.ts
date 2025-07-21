import {
  DOCKER_INSTANCE_IMAGE_NAME,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_URL,
  MothershipAdminClientService,
  PocketbaseService,
  discordAlert,
  instanceService,
  logger,
  neverendingPromise,
  proxyService,
  realtimeLog,
  tryFetch,
} from '@'
import Dockerode from 'dockerode'
import { ErrorRequestHandler } from 'express'
import { MothershipMirrorService } from 'src/services/MothershipMirrorService'

export async function daemon() {
  const { info, warn } = logger()
  info(`Starting`)

  const docker = new Dockerode()

  // Stop all running containers
  info(`Stopping all running Docker containers`)
  const containers = await docker.listContainers({ all: true })
  info(`Found ${containers.length} containers`)
  await Promise.all(
    containers.map(async (container) => {
      if (container.State === 'running' && container.Image === DOCKER_INSTANCE_IMAGE_NAME) {
        try {
          info(`Stopping ${container.Id}`)
          await docker.getContainer(container.Id).stop()
          info(`Stopped ${container.Id}`)
        } catch (e) {
          warn(`Failed to stop ${container.Id}, but that's probably OK`, e)
        }
      }
    })
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

  await MothershipMirrorService({ client: (await MothershipAdminClientService()).client.client })

  await proxyService({
    coreInternalUrl: MOTHERSHIP_URL(),
  })
  await realtimeLog({})
  await instanceService({
    instanceApiCheckIntervalMs: 50,
    instanceApiTimeoutMs: 5000,
  })

  const errorHandler: ErrorRequestHandler = (err: Error, req, res, next) => {
    discordAlert(err)
    res.status(500).send(err.toString())
  }
  ;(await proxyService()).use(errorHandler)

  await neverendingPromise()
}
