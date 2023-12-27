import {
  DATA_ROOT,
  DEBUG,
  DefaultSettingsService,
  DISCORD_POCKETSTREAM_URL,
  mkContainerHomePath,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_HOOKS_DIR,
  MOTHERSHIP_INTERNAL_URL,
  MOTHERSHIP_MIGRATIONS_DIR,
  MOTHERSHIP_NAME,
  MOTHERSHIP_PORT,
  MOTHERSHIP_SEMVER,
  PH_BIN_CACHE,
  SETTINGS,
} from '$constants'
import {
  centralDbService,
  ftpService,
  instanceService,
  MothershipAdmimClientService,
  PocketbaseReleaseVersionService,
  PocketbaseService,
  PortService,
  proxyService,
  realtimeLog,
  SqliteService,
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
  const logger = LoggerService().create(`server.ts`)
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
  await new Promise<string>((resolve) => {
    const mothership = async () => {
      try {
        const { url, exitCode } = await pbService.spawn({
          version: MOTHERSHIP_SEMVER(),
          name: MOTHERSHIP_NAME(),
          slug: MOTHERSHIP_NAME(),
          port: MOTHERSHIP_PORT(),
          env: {
            DATA_ROOT: mkContainerHomePath(`data`),
            DISCORD_POCKETSTREAM_URL: DISCORD_POCKETSTREAM_URL(),
          },
          extraBinds: [
            `${DATA_ROOT()}:${mkContainerHomePath(`data`)}`,
            `${MOTHERSHIP_HOOKS_DIR()}:${mkContainerHomePath(`pb_hooks`)}`,
            `${MOTHERSHIP_MIGRATIONS_DIR()}:${mkContainerHomePath(
              `pb_migrations`,
            )}`,
          ],
        })
        resolve(url)
        await exitCode
        console.log(`got exit code on mothership`, { exitCode })
      } catch (e) {
        error(e)
      } finally {
        console.log(`finally executing`)
        setTimeout(mothership, 10000)
      }
    }
    mothership()
  })
  info(`Mothership URL for this session is ${MOTHERSHIP_INTERNAL_URL()}`)

  /**
   * Launch services
   */
  await MothershipAdmimClientService({
    url: MOTHERSHIP_INTERNAL_URL(),
    username: MOTHERSHIP_ADMIN_USERNAME(),
    password: MOTHERSHIP_ADMIN_PASSWORD(),
  })
  await ftpService({
    mothershipUrl: MOTHERSHIP_INTERNAL_URL(),
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
  await centralDbService({})
  // gen:service

  info(`Hooking into process exit event`)
})()
