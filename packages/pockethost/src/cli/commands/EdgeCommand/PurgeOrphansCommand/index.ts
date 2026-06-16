import { logger } from '@'
import { Command } from 'commander'

export const PurgeOrphansCommand = () => {
  const cmd = new Command(`purge-orphans`)
    .description(`Remove instance data directories with no mothership record`)
    .option('--dry-run', `Report orphan directories without removing them`, false)
    .action(async ({ dryRun }) => {
      logger().context({ cli: 'edge:purge-orphans' })
      const { info } = logger()
      info(`Starting${dryRun ? ' (dry run)' : ''}`)
      const { purgeOrphanInstanceData } = await import('./purgeOrphans')
      await purgeOrphanInstanceData({ dryRun })
      info(`Done`)
    })
  return cmd
}
