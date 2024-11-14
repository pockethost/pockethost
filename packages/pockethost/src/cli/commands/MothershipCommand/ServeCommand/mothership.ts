import { GobotOptions } from 'gobot'
import {
  DISCORD_ALERT_CHANNEL_URL,
  DISCORD_HEALTH_CHANNEL_URL,
  DISCORD_STREAM_CHANNEL_URL,
  DISCORD_TEST_CHANNEL_URL,
  IS_DEV,
  LS_WEBHOOK_SECRET,
  LoggerService,
  MOTHERSHIP_DATA_ROOT,
  MOTHERSHIP_HOOKS_DIR,
  MOTHERSHIP_MIGRATIONS_DIR,
  MOTHERSHIP_PORT,
  MOTHERSHIP_SEMVER,
  TEST_EMAIL,
  _MOTHERSHIP_APP_ROOT,
  mkContainerHomePath,
} from '../../../../../core'
import { GobotService } from '../../../../services/GobotService'

export type MothershipConfig = {}

export async function mothership(cfg: MothershipConfig) {
  const logger = LoggerService().create(`Mothership`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  /** Launch central database */
  info(`Serving`)
  const env = {
    DATA_ROOT: mkContainerHomePath(`data`),
    LS_WEBHOOK_SECRET: LS_WEBHOOK_SECRET(),
    DISCORD_TEST_CHANNEL_URL: DISCORD_TEST_CHANNEL_URL(),
    DISCORD_STREAM_CHANNEL_URL: DISCORD_STREAM_CHANNEL_URL(),
    DISCORD_HEALTH_CHANNEL_URL: DISCORD_HEALTH_CHANNEL_URL(),
    DISCORD_ALERT_CHANNEL_URL: DISCORD_ALERT_CHANNEL_URL(),
    TEST_EMAIL: TEST_EMAIL(),
  }
  dbg(env)

  const options: Partial<GobotOptions> = {
    version: MOTHERSHIP_SEMVER(),
    env,
  }
  dbg(`options`, options)
  const { gobot } = GobotService()
  const bot = await gobot(`pocketbase`, options)

  const args = [
    `serve`,
    `--http`,
    `0.0.0.0:${MOTHERSHIP_PORT()}`,
    `--dir`,
    MOTHERSHIP_DATA_ROOT(`pb_data`),
    `--hooksDir`,
    MOTHERSHIP_HOOKS_DIR(),
    `--migrationsDir`,
    MOTHERSHIP_MIGRATIONS_DIR(),
    `--publicDir`,
    _MOTHERSHIP_APP_ROOT(`pb_public`),
  ]
  if (IS_DEV()) {
    args.push(`--dev`)
  }
  dbg({ args })
  const code = await bot.run(args, { env, cwd: _MOTHERSHIP_APP_ROOT() })
  dbg({ code })
}
