import {
  DEBUG,
  DefaultSettingsService,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_INTERNAL_URL,
  PH_BIN_CACHE,
  SETTINGS,
} from '$constants'
import {
  MothershipAdmimClientService,
  PocketbaseReleaseVersionService,
  PocketbaseService,
  PortService,
  SqliteService,
  instanceService,
  proxyService,
  realtimeLog,
} from '$services'
import { LogLevelName, LoggerService } from '$shared'
import { tryFetch } from '$util'
import EventSource from 'eventsource'
// gen:import

const [major, minor, patch] = process.versions.node.split('.').map(Number)

if ((major || 0) < 18) {
  throw new Error(`Node 18 or higher required.`)
}

DefaultSettingsService(SETTINGS)

LoggerService({
  level: DEBUG() ? LogLevelName.Debug : LogLevelName.Info,
})

// npm install eventsource --save
// @ts-ignore
global.EventSource = EventSource
;(async () => {
  const logger = LoggerService().create(`server.ts`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  tryFetch(`${MOTHERSHIP_INTERNAL_URL(`/api/health`)}`, {})

  const udService = await PocketbaseReleaseVersionService({
    cachePath: PH_BIN_CACHE(),
    checkIntervalMs: 1000 * 5 * 60,
  })

  await PortService({})
  await PocketbaseService({})

  info(`Serving`)

  /**
   * Launch services
   */
  await MothershipAdmimClientService({
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

  info(`Hooking into process exit event`)
})()
