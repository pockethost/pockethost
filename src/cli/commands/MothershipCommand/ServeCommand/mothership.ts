import {
  DATA_ROOT,
  DEBUG,
  IS_DEV,
  LS_WEBHOOK_SECRET,
  mkContainerHomePath,
  MOTHERSHIP_APP_DIR,
  MOTHERSHIP_DATA_ROOT,
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
import copyfiles from 'copyfiles'
import { run } from 'pbgo'
import { rimraf } from 'rimraf'

export type MothershipConfig = { isolate: boolean }

const _copy = (src: string, dst: string) => {
  const { error } = LoggerService().create(`copy`)

  return new Promise<void>((resolve) => {
    copyfiles(
      [src, dst],
      {
        verbose: DEBUG(),
        up: true,
      },
      (err) => {
        if (err) {
          error(err)
          throw err
        }
        resolve()
      },
    )
  })
}

export async function mothership(cfg: MothershipConfig) {
  const { isolate } = cfg
  const logger = LoggerService().create(`Mothership`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  dbg(`Isolation mode:`, { isolate })

  await PortService({})

  /** Launch central database */
  info(`Serving`)
  if (isolate) {
    await PocketbaseReleaseVersionService({})
    const pbService = await PocketbaseService({})
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
        `${MOTHERSHIP_MIGRATIONS_DIR()}:${mkContainerHomePath(
          `pb_migrations`,
        )}`,
        `${MOTHERSHIP_APP_DIR()}:${mkContainerHomePath(`ph_app`)}`,
      ],
    })
    info(`Mothership URL for this session is ${url}`)
    exitCode.then((c) => {
      gracefulExit(c)
    })
  } else {
    await rimraf(MOTHERSHIP_DATA_ROOT(`pb_hooks`))
    await _copy(MOTHERSHIP_HOOKS_DIR(`**/*`), MOTHERSHIP_DATA_ROOT(`pb_hooks`))
    await _copy(PH_VERSIONS(), MOTHERSHIP_DATA_ROOT(`pb_hooks`))
    await rimraf(MOTHERSHIP_DATA_ROOT(`pb_migrations`))
    await _copy(
      MOTHERSHIP_MIGRATIONS_DIR(`**/*`),
      MOTHERSHIP_DATA_ROOT(`pb_migrations`),
    )
    const args = [
      `serve`,
      `--http`,
      `0.0.0.0:${MOTHERSHIP_PORT()}`,
      `--dir`,
      MOTHERSHIP_DATA_ROOT(`pb_data`),
      `--hooksDir`,
      MOTHERSHIP_DATA_ROOT(`pb_hooks`),
      `--migrationsDir`,
      MOTHERSHIP_DATA_ROOT(`pb_migrations`),
      `--publicDir`,
      MOTHERSHIP_DATA_ROOT(`pb_public`),
    ]
    if (IS_DEV()) {
      args.push(`--dev`)
    }
    dbg(args)
    const process = run(args, {
      env: {
        DATA_ROOT: DATA_ROOT(),
        LS_WEBHOOK_SECRET: LS_WEBHOOK_SECRET(),
      },
      version: MOTHERSHIP_SEMVER(),
      debug: DEBUG(),
    })
  }
}
