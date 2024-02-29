import {
  DATA_ROOT,
  DEBUG,
  LS_WEBHOOK_SECRET,
  mkContainerHomePath,
  MOTHERSHIP_APP_DIR,
  MOTHERSHIP_HOOKS_DIR,
  MOTHERSHIP_MIGRATIONS_DIR,
  MOTHERSHIP_NAME,
  MOTHERSHIP_PORT,
  MOTHERSHIP_SEMVER,
  PH_VERSIONS,
} from '$constants'
import {
  PocketbaseReleaseVersionService,
  PocketbaseService,
  PortService,
} from '$services'
import { LoggerService } from '$shared'
import { gracefulExit } from '$util'

export async function mothership() {
  const logger = LoggerService().create(`Mothership`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  await PortService({})
  await PocketbaseReleaseVersionService({})
  const pbService = await PocketbaseService({})

  /** Launch central database */
  info(`Serving`)
  const { url, exitCode } = await pbService.spawn({
    version: MOTHERSHIP_SEMVER(),
    subdomain: MOTHERSHIP_NAME(),
    instanceId: MOTHERSHIP_NAME(),
    port: MOTHERSHIP_PORT(),
    dev: DEBUG(),
    env: {
      DATA_ROOT: mkContainerHomePath(`data`),
      LS_WEBHOOK_SECRET: LS_WEBHOOK_SECRET(),
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
  exitCode.then((c) => {
    gracefulExit(c)
  })
}
