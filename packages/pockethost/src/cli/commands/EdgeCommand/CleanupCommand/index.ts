import { logger } from '@'
import { Command } from 'commander'

export const CleanupCommand = () => {
  const cmd = new Command(`cleanup`)
    .description(`Remove instance data directories with no mothership record`)
    .action(async () => {
      logger().context({ cli: 'edge:cleanup' })
      const { info } = logger()
      info(`Starting`)
      const { cleanupOrphanInstanceData } = await import('./cleanup')
      await cleanupOrphanInstanceData()
      info(`Done`)
    })
  return cmd
}
