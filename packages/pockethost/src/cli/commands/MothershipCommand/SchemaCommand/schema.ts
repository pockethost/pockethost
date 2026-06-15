import {
  IS_DEV,
  Logger,
  MOTHERSHIP_DATA_ROOT,
  MOTHERSHIP_MIGRATIONS_DIR,
  MOTHERSHIP_SEMVER,
  PocketBaseBinaryService,
} from '@'

export type SchemaOptions = {
  logger: Logger
}

export async function schema({ logger }: SchemaOptions) {
  const { dbg, error, info } = logger.create(`schema`)
  info(`Starting`)

  const pb = PocketBaseBinaryService()

  const args = [
    `migrate`,
    `collections`,
    `--automigrate`,
    `0`,
    `--hooksDir`,
    `foo`,
    `--dir`,
    MOTHERSHIP_DATA_ROOT(`pb_data`),
    `--migrationsDir`,
    MOTHERSHIP_MIGRATIONS_DIR(),
  ]
  if (IS_DEV()) {
    args.push(`--dev`)
  }
  dbg({ args })
  const pbData = MOTHERSHIP_DATA_ROOT(`pb_data`)
  const migrationsDir = MOTHERSHIP_MIGRATIONS_DIR()
  const code = await pb.run(MOTHERSHIP_SEMVER(), args, {
    binds: [`${pbData}:${pbData}`, `${migrationsDir}:${migrationsDir}`],
  })
  if (code !== 0) {
    error(`Failed to migrate schema ${code}`)
  }
}
