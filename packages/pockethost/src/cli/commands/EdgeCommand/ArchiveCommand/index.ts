import { ARCHIVE_DEFAULTS, logger } from '@'
import { Command } from 'commander'

const int = (v: string) => parseInt(v, 10)

export const ArchiveCommand = () => {
  const cmd = new Command(`archive`).description(`Archive stale free-plan instances to object storage`)

  cmd
    .command(`stale`)
    .description(
      `Suspend and archive free instances with no start in --stale-days; delete archives after --retention-days`
    )
    .option(`--apply`, `Actually archive and delete (default is a dry run)`, false)
    .option(`--stale-days <days>`, `Days since last start`, int, ARCHIVE_DEFAULTS.staleDays)
    .option(`--retention-days <days>`, `Days to keep archives`, int, ARCHIVE_DEFAULTS.retentionDays)
    .option(`--max-instances <n>`, `Max instances to archive per run`, int, 200)
    .option(`--max-gb <gb>`, `Max GB to archive per run`, int, 100)
    .option(`--email`, `Email each owner a download link (off by default)`, false)
    .option(`--batch-size <n>`, `Instances suspended together (one settle wait per batch)`, int, 50)
    .option(`--concurrency <n>`, `Uploads running at once`, int, 8)
    .option(`--include-lapsed`, `Also archive owners who used to pay (subscription_status=lapsed)`, false)
    .action(
      async ({
        apply,
        staleDays,
        retentionDays,
        maxInstances,
        maxGb,
        includeLapsed,
        email,
        batchSize,
        concurrency,
      }) => {
        logger().context({ cli: 'edge:archive:stale' })
        const { archiveStaleInstances } = await import('./archiveStale')
        await archiveStaleInstances({
          apply,
          staleDays,
          retentionDays,
          maxInstances,
          maxBytes: maxGb * 1024 ** 3,
          includeLapsed,
          email,
          batchSize,
          concurrency,
        })
      }
    )

  cmd
    .command(`restore <instanceId>`)
    .description(`Restore an archived instance's data and clear its suspension`)
    .action(async (instanceId: string) => {
      logger().context({ cli: 'edge:archive:restore' })
      const { restoreArchivedInstance } = await import('./archiveStale')
      await restoreArchivedInstance(instanceId)
    })

  return cmd
}
