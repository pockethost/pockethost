import { DAEMON_PB_SEMVER, PUBLIC_MOTHERSHIP_NAME } from '$constants'
import { pocketbaseService } from '$services'
import { LoggerService } from '@pockethost/common'

const migrateMothership = async () => {
  const logger = LoggerService().create(`migrateMothership`)
  const { dbg, error, info, warn } = logger

  const pbService = await pocketbaseService()
  info(`Migrating mothership`)
  await (
    await pbService.spawn({
      command: 'migrate',
      isMothership: true,
      version: DAEMON_PB_SEMVER,
      name: PUBLIC_MOTHERSHIP_NAME,
      slug: PUBLIC_MOTHERSHIP_NAME,
    })
  ).exitCode
  info(`Migrating done`)
}
