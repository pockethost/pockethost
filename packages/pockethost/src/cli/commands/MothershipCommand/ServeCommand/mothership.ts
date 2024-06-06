import {
  DEBUG,
  IS_DEV,
  LS_WEBHOOK_SECRET,
  MOTHERSHIP_DATA_ROOT,
  MOTHERSHIP_HOOKS_DIR,
  MOTHERSHIP_MIGRATIONS_DIR,
  MOTHERSHIP_PORT,
  MOTHERSHIP_SEMVER,
  mkContainerHomePath,
} from '$constants'
import { LoggerService } from '$public'
import { PortService } from '$services'
import copyfiles from 'copyfiles'
import { GobotOptions, gobot } from 'gobot'
import { rimraf } from 'rimraf'
import { freshenPocketbaseVersions } from '../freshenPocketbaseVersions'

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
  const env = {
    DATA_ROOT: mkContainerHomePath(`data`),
    LS_WEBHOOK_SECRET: LS_WEBHOOK_SECRET(),
  }
  dbg(env)
  await rimraf(MOTHERSHIP_DATA_ROOT(`pb_hooks`))
  await _copy(MOTHERSHIP_HOOKS_DIR(`**/*`), MOTHERSHIP_DATA_ROOT(`pb_hooks`))
  await rimraf(MOTHERSHIP_DATA_ROOT(`pb_migrations`))
  await _copy(
    MOTHERSHIP_MIGRATIONS_DIR(`**/*`),
    MOTHERSHIP_DATA_ROOT(`pb_migrations`),
  )
  await freshenPocketbaseVersions()
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
  const options: Partial<GobotOptions> = {
    version: MOTHERSHIP_SEMVER(),
    env,
  }
  dbg(`args`, args)
  dbg(`options`, options)
  const bot = await gobot(`pocketbase`, options)
  bot.run(args, { env })
}
