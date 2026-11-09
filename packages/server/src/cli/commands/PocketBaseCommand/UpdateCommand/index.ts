import { freshenPocketbaseVersions, logger } from '@'
import { Command } from 'commander'

export const UpdateCommand = () => {
  const cmd = new Command(`update`).description(`Update PocketBase versions`).action(async () => {
    logger().context({ cli: 'pocketbase:update' })
    const { info, error } = logger()
    try {
      await freshenPocketbaseVersions()
      info('PocketBase versions updated')
    } catch (e) {
      error(`PocketBase update failed: ${e}`)
      process.exitCode = 1
    }
  })
  return cmd
}
