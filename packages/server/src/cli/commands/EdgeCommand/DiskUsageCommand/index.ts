import { logger } from '@'
import { Command } from 'commander'

const int = (v: string) => parseInt(v, 10)

export const DiskUsageCommand = () =>
  new Command(`disk-usage`)
    .description(
      `Measure each instance folder with du and write each owner's total to users.volume_storage_used (display only)`
    )
    .option(`--dry-run`, `Print a summary and write nothing`, false)
    .option(`--concurrency <n>`, `du processes running at once`, int, 4)
    .action(async ({ dryRun, concurrency }) => {
      logger().context({ cli: 'edge:disk-usage' })
      const { measureDiskUsage } = await import('./diskUsage')
      await measureDiskUsage({ dryRun, concurrency })
    })
