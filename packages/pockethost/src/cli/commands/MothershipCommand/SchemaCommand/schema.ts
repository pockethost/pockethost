import {
  GobotService,
  IS_DEV,
  LoggerService,
  MOTHERSHIP_DATA_ROOT,
  MOTHERSHIP_MIGRATIONS_DIR,
  MOTHERSHIP_SEMVER,
} from '@'
import { GobotOptions } from 'gobot'

export async function schema() {
  const logger = LoggerService().create(`MothershipSchema`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  const options: Partial<GobotOptions> = {
    version: MOTHERSHIP_SEMVER(),
  }
  dbg(`gobot options`, options)
  const { gobot } = GobotService()
  const bot = await gobot(`pocketbase`, options)

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
  const code = await bot.run(args)
  if (code !== 0) {
    error(`Failed to migrate schema ${code}`)
  }
}
