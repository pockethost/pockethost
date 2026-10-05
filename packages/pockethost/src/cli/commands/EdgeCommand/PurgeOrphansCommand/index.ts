import { logger } from '@'
import { Command } from 'commander'

export const PurgeOrphansCommand = () => {
  const cmd = new Command(`purge-orphans`)
    .description(`Quarantine instance data with no mothership record, then delete after a retention period`)
    .option('--dry-run', `Report actions without moving or removing data`, false)
    .option(
      '--quarantine-days <days>',
      `Days to keep quarantined data before permanent removal`,
      (v) => parseInt(v, 10),
      30
    )
    .action(async ({ dryRun, quarantineDays }) => {
      logger().context({ cli: 'edge:purge-orphans' })
      const { info } = logger()
      info(`Starting${dryRun ? ' (dry run)' : ''}`)
      const { purgeOrphanInstanceData } = await import('./purgeOrphans')
      await purgeOrphanInstanceData({ dryRun, quarantineDays })
      info(`Done`)
    })
  return cmd
}
