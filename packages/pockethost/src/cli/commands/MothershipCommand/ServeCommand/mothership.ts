import {
  _MOTHERSHIP_APP_ROOT,
  APP_URL,
  DISCORD_ALERT_CHANNEL_URL,
  DISCORD_HEALTH_CHANNEL_URL,
  DISCORD_STREAM_CHANNEL_URL,
  DISCORD_TEST_CHANNEL_URL,
  exitHook,
  GobotService,
  IS_DEV,
  LoggerService,
  LS_WEBHOOK_SECRET,
  mkContainerHomePath,
  MOTHERSHIP_CLOUDFLARE_ACCOUNT_ID,
  MOTHERSHIP_CLOUDFLARE_API_TOKEN,
  MOTHERSHIP_CLOUDFLARE_ZONE_ID,
  MOTHERSHIP_DATA_ROOT,
  MOTHERSHIP_HOOKS_DIR,
  MOTHERSHIP_MIGRATIONS_DIR,
  MOTHERSHIP_PORT,
  MOTHERSHIP_SEMVER,
  MOTHERSHIP_URL,
  TEST_EMAIL,
  tryFetch,
} from '@'
import { GobotOptions } from 'gobot'

export type MothershipConfig = {}

export async function mothership(cfg: MothershipConfig) {
  const logger = LoggerService().create(`cli:mothership`)
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
    APP_URL: APP_URL(),
    MOTHERSHIP_CLOUDFLARE_API_TOKEN: MOTHERSHIP_CLOUDFLARE_API_TOKEN(),
    MOTHERSHIP_CLOUDFLARE_ZONE_ID: MOTHERSHIP_CLOUDFLARE_ZONE_ID(),
    MOTHERSHIP_CLOUDFLARE_ACCOUNT_ID: MOTHERSHIP_CLOUDFLARE_ACCOUNT_ID(),
  }
  dbg({ env })

  const options: Partial<GobotOptions> = {
    version: MOTHERSHIP_SEMVER(),
    env,
  }
  dbg({ options })
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

  bot.run(args, { env, cwd: _MOTHERSHIP_APP_ROOT() }, (proc) => {
    proc.stdout.on('data', (data) => {
      info(data.toString())
    })
    proc.stderr.on('data', (data) => {
      error(data.toString())
    })
    proc.on('close', (code, signal) => {
      error(`Pocketbase exited with code ${code} and signal ${signal}`)
    })
    proc.on('error', (err) => {
      error(`Pocketbase error: ${err}`)
    })
    proc.on('exit', (code, signal) => {
      error(`Pocketbase exited with code ${code} and signal ${signal}`)
    })
    proc.on('message', (msg) => {
      console.log(`***message`, msg)
    })
    exitHook(() => {
      proc.kill()
    })
  })
  const ready = tryFetch(MOTHERSHIP_URL(`/api/health`), { logger })
  return ready
}
