import copyfiles from 'copyfiles'
import { GobotOptions } from 'gobot'
import { rimraf } from 'rimraf'
import {
  DEBUG,
  IS_DEV,
  LS_WEBHOOK_SECRET,
  LoggerService,
  MOTHERSHIP_DATA_ROOT,
  MOTHERSHIP_HOOKS_DIR,
  MOTHERSHIP_MIGRATIONS_DIR,
  MOTHERSHIP_PORT,
  MOTHERSHIP_SEMVER,
  mkContainerHomePath,
} from '../../../../../core'
import { PortService } from '../../../../services'
import { GobotService } from '../../../../services/GobotService'

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

  const options: Partial<GobotOptions> = {
    version: MOTHERSHIP_SEMVER(),
    env,
  }
  dbg(`options`, options)
  const { gobot } = GobotService()
  const bot = await gobot(`pocketbase`, options)

  await rimraf(MOTHERSHIP_DATA_ROOT(`pb_hooks`))
  await _copy(MOTHERSHIP_HOOKS_DIR(`**/*`), MOTHERSHIP_DATA_ROOT(`pb_hooks`))
  await _copy(bot.cachePath(`versions.cjs`), MOTHERSHIP_DATA_ROOT(`pb_hooks`))
  await rimraf(MOTHERSHIP_DATA_ROOT(`pb_migrations`))
  await _copy(
    MOTHERSHIP_MIGRATIONS_DIR(`**/*`),
    MOTHERSHIP_DATA_ROOT(`pb_migrations`),
  )
  // await freshenPocketbaseVersions()
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
  dbg(`args`, args)
  bot.run(args, { env })
}
