import {
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_INTERNAL_URL,
} from '$constants'
import { LoggerService } from '$public'
import {
  MothershipAdminClientService,
  PocketbaseService,
  PortService,
  SqliteService,
  instanceService,
  proxyService,
  realtimeLog,
} from '$services'
import { discordAlert, tryFetch } from '$util'
import { ErrorRequestHandler } from 'express'

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
  await SqliteService({})
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
