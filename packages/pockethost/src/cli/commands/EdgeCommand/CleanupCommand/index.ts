import { logger } from '@'
import { Command } from 'commander'

export const CleanupCommand = () => {
  const cmd = new Command(`cleanup`)
    .description(`Remove instance data directories with no mothership record`)
    .option('--dry-run', `Report orphan directories without removing them`, false)
    .action(async ({ dryRun }) => {
      logger().context({ cli: 'edge:cleanup' })
      const { info } = logger()
      info(`Starting${dryRun ? ' (dry run)' : ''}`)
      const { cleanupOrphanInstanceData } = await import('./cleanup')
      await cleanupOrphanInstanceData({ dryRun })
      info(`Done`)
    })
  return cmd
}
