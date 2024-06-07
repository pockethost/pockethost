import { ErrorRequestHandler } from 'express'
import { LoggerService } from '../../../../../common'
import {
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_INTERNAL_URL,
  discordAlert,
  tryFetch,
} from '../../../../../core'
import {
  MothershipAdminClientService,
  PocketbaseService,
  PortService,
  instanceService,
  proxyService,
  realtimeLog,
} from '../../../../../services'

export async function daemon() {
  const logger = LoggerService().create(`EdgeDaemonCommand`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  await PortService({})
  await PocketbaseService({})

  await tryFetch(`${MOTHERSHIP_INTERNAL_URL(`/api/health`)}`, {})

  info(`Serving`)

  /** Launch services */
  await MothershipAdminClientService({
    url: MOTHERSHIP_INTERNAL_URL(),
    username: MOTHERSHIP_ADMIN_USERNAME(),
    password: MOTHERSHIP_ADMIN_PASSWORD(),
  })

  await proxyService({
    coreInternalUrl: MOTHERSHIP_INTERNAL_URL(),
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
