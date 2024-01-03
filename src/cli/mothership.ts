import {
  DATA_ROOT,
  DEBUG,
  DefaultSettingsService,
  mkContainerHomePath,
  MOTHERSHIP_APP_DIR,
  MOTHERSHIP_HOOKS_DIR,
  MOTHERSHIP_MIGRATIONS_DIR,
  MOTHERSHIP_NAME,
  MOTHERSHIP_PORT,
  MOTHERSHIP_SEMVER,
  PH_BIN_CACHE,
  PH_VERSIONS,
  SETTINGS,
} from '$constants'
import {
  PocketbaseReleaseVersionService,
  PocketbaseService,
  PortService,
} from '$services'
import { LoggerService, LogLevelName } from '$shared'
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
  const logger = LoggerService().create(`mothership.ts`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  const udService = await PocketbaseReleaseVersionService({
    cachePath: PH_BIN_CACHE(),
    checkIntervalMs: 1000 * 5 * 60,
  })

  await PortService({})
  const pbService = await PocketbaseService({})

  /**
   * Launch central database
   */

  info(`Serving`)
  const { url, exitCode } = await pbService.spawn({
    version: MOTHERSHIP_SEMVER(),
    subdomain: MOTHERSHIP_NAME(),
    instanceId: MOTHERSHIP_NAME(),
    port: MOTHERSHIP_PORT(),
    dev: DEBUG(),
    env: {
      DATA_ROOT: mkContainerHomePath(`data`),
    },
    extraBinds: [
      `${DATA_ROOT()}:${mkContainerHomePath(`data`)}`,
      `${MOTHERSHIP_HOOKS_DIR()}:${mkContainerHomePath(`pb_hooks`)}`,
      `${PH_VERSIONS()}:${mkContainerHomePath(`pb_hooks`, `versions.js`)}`,
      `${MOTHERSHIP_MIGRATIONS_DIR()}:${mkContainerHomePath(`pb_migrations`)}`,
      `${MOTHERSHIP_APP_DIR()}:${mkContainerHomePath(`ph_app`)}`,
    ],
  })
  info(`Mothership URL for this session is ${url}`)
})()
