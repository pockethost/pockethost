import { logger } from '@'
import { Command } from 'commander'
import { freshenPocketbaseVersions } from './freshenPocketbaseVersions'

export const UpdateCommand = () => {
  const cmd = new Command(`update`).description(`Update PocketBase versions`).action(async (options) => {
    logger().context({ cli: 'pocketbase:update' })
    const { info } = logger()
    await freshenPocketbaseVersions()
    info('PocketBase versions updated')
  })
  return cmd
}
