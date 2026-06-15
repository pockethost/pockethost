import {
  _MOTHERSHIP_APP_ROOT,
  APP_URL,
  asyncExitHook,
  DISCORD_ALERT_CHANNEL_URL,
  DISCORD_HEALTH_CHANNEL_URL,
  DISCORD_STREAM_CHANNEL_URL,
  DISCORD_TEST_CHANNEL_URL,
  exitHook,
  IS_DEV,
  Logger,
  LS_WEBHOOK_SECRET,
  mkContainerHomePath,
  MOTHERSHIP_CLOUDFLARE_ACCOUNT_ID,
  MOTHERSHIP_CLOUDFLARE_API_TOKEN,
  MOTHERSHIP_CLOUDFLARE_ZONE_ID,
  MOTHERSHIP_CONTAINER_NAME,
  MOTHERSHIP_DATA_ROOT,
  MOTHERSHIP_HOOKS_DIR,
  MOTHERSHIP_MIGRATIONS_DIR,
  MOTHERSHIP_PORT,
  MOTHERSHIP_SEMVER,
  MOTHERSHIP_URL,
  PH_CONTAINER_STOP_TIMEOUT_SEC,
  PocketBaseBinaryService,
  rmNamedContainerSync,
  spawnPocketBaseContainer,
  TEST_EMAIL,
  tryFetch,
} from '@'

export type MothershipConfig = {
  logger: Logger
}

export async function mothership({ logger }: MothershipConfig) {
  const { dbg, error, info } = logger.create(`mothership`)
  info(`Starting`)

  /** Launch central database */
  info(`Serving`)
  const env = Object.fromEntries(
    Object.entries({
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
    }).filter((entry): entry is [string, string] => entry[1] != null && entry[1] !== '')
  )
  dbg({ env })

  const pb = PocketBaseBinaryService()
  const port = MOTHERSHIP_PORT()
  const pbData = mkContainerHomePath('pb_data')
  const hooksDir = mkContainerHomePath('pb_hooks')
  const migrationsDir = mkContainerHomePath('pb_migrations')
  const publicDir = mkContainerHomePath('pb_public')

  const args = [
    `serve`,
    `--http`,
    `0.0.0.0:${port}`,
    `--dir`,
    pbData,
    `--hooksDir`,
    hooksDir,
    `--migrationsDir`,
    migrationsDir,
    `--publicDir`,
    publicDir,
  ]
  if (IS_DEV()) {
    args.push(`--dev`)
  }
  dbg({ args })

  const logLines = (lines: string[], log: (line: string) => void) => {
    lines.forEach((line) => {
      if (line) log(line)
    })
  }

  if (pb.needsContainerRuntime()) {
    info(`Starting mothership in Docker (${pb.platform.os}_${pb.platform.arch})`)
    const binPath = await pb.ensureBinary(MOTHERSHIP_SEMVER())
    const container = await spawnPocketBaseContainer({
      binPath,
      args,
      binds: [
        `${MOTHERSHIP_DATA_ROOT('pb_data')}:${pbData}`,
        `${MOTHERSHIP_HOOKS_DIR()}:${hooksDir}:ro`,
        `${MOTHERSHIP_MIGRATIONS_DIR()}:${migrationsDir}:ro`,
        `${_MOTHERSHIP_APP_ROOT('pb_public')}:${publicDir}:ro`,
      ],
      env,
      port,
      autoRemove: true,
      name: MOTHERSHIP_CONTAINER_NAME,
      onStdout: (chunk) => logLines(chunk.split('\n'), info),
      onStderr: (chunk) => logLines(chunk.split('\n'), error),
      onExit: (code) => error(`Pocketbase exited with code ${code}`),
    })
    process.on('SIGINT', () => {
      rmNamedContainerSync(MOTHERSHIP_CONTAINER_NAME)
    })
    exitHook(() => {
      rmNamedContainerSync(MOTHERSHIP_CONTAINER_NAME)
    })
    asyncExitHook(
      async () => {
        await container.kill()
      },
      (PH_CONTAINER_STOP_TIMEOUT_SEC() + 2) * 1000
    )
  } else {
    pb.run(
      MOTHERSHIP_SEMVER(),
      [
        `serve`,
        `--http`,
        `0.0.0.0:${port}`,
        `--dir`,
        MOTHERSHIP_DATA_ROOT(`pb_data`),
        `--hooksDir`,
        MOTHERSHIP_HOOKS_DIR(),
        `--migrationsDir`,
        MOTHERSHIP_MIGRATIONS_DIR(),
        `--publicDir`,
        _MOTHERSHIP_APP_ROOT(`pb_public`),
        ...(IS_DEV() ? [`--dev`] : []),
      ],
      { env, cwd: _MOTHERSHIP_APP_ROOT() },
      (proc) => {
        proc.stdout?.on('data', (data) => logLines(data.toString().split(`\n`), info))
        proc.stderr?.on('data', (data) => logLines(data.toString().split(`\n`), error))
        proc.on('close', (code, signal) => {
          error(`Pocketbase exited with code ${code} and signal ${signal}`)
        })
        proc.on('error', (err) => {
          error(`Pocketbase error: ${err}`)
        })
        proc.on('exit', (code, signal) => {
          error(`Pocketbase exited with code ${code} and signal ${signal}`)
        })
        exitHook(() => {
          proc.kill()
        })
      }
    )
  }
  const ready = tryFetch(MOTHERSHIP_URL(`/api/health`), { logger })
  return ready
}
