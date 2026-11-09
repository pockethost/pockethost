import {
  DeployService,
  discordAlert,
  EdgeHeartbeatService,
  instanceService,
  isSystemError,
  Logger,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_URL,
  MothershipAdminClientService,
  type PhError,
  PocketbaseService,
  proxyService,
  realtimeLog,
  tryFetch,
} from '@'
import { ErrorRequestHandler } from 'express'
import { CronService } from 'src/services/CronService'
import { MothershipMirrorService } from 'src/services/MothershipMirrorService'

export type DaemonOptions = {
  logger: Logger
}

export async function daemon({ logger }: DaemonOptions) {
  const { info } = logger.create(`daemon`)
  info(`Starting`)

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

  await proxyService({
    coreInternalUrl: MOTHERSHIP_URL(),
    logger,
  })

  await EdgeHeartbeatService({ logger })

  await realtimeLog({ logger })
  // Mounted before instanceService so /_ph/deploy/* is never proxied to the instance.
  await DeployService({ logger })
  await instanceService({
    instanceApiCheckIntervalMs: 50,
    instanceApiTimeoutMs: 5000,
    logger,
  })

  await CronService({ logger })

  const errorHandler: ErrorRequestHandler = (err: Error, req, res, next) => {
    if (isSystemError(err)) {
      discordAlert(err)
    }
    res.status((err as PhError).httpStatus ?? 500).send(err.toString())
  }
  ;(await proxyService()).use(errorHandler)
}
