import {
  MOTHERSHIP_HOOKS_DIR,
  MOTHERSHIP_MIGRATIONS_DIR,
  MOTHERSHIP_NAME,
  MOTHERSHIP_SEMVER,
} from '$constants'
import { PocketbaseService } from '$services'
import { LoggerService } from '$shared'

export const migrateMothership = async () => {
  const logger = LoggerService().create(`migrateMothership`)
  const { dbg, error, info, warn } = logger

  const pbService = await PocketbaseService()
  dbg(`Migrating mothership`)
  await (
    await pbService.spawn({
      command: 'migrate',
      version: MOTHERSHIP_SEMVER(),
      name: MOTHERSHIP_NAME(),
      slug: MOTHERSHIP_NAME(),
      extraBinds: [
        `${MOTHERSHIP_HOOKS_DIR()}:/home/pocketbase/pb_hooks:ro`,
        `${MOTHERSHIP_MIGRATIONS_DIR()}:/home/pocketbase/pb_migrations:ro`,
      ],
    })
  ).exitCode
  dbg(`Migrating done`)
}
