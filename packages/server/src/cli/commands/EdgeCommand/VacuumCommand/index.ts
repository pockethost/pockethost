import { logger } from '@'
import { Command } from 'commander'

export const VacuumCommand = () => {
  const cmd = new Command(`vacuum`)
    .description(`VACUUM idle instance and local Mothership SQLite databases; posts summary to Discord health channel`)
    .option(`--dry-run`, `Report databases that would be vacuumed without running VACUUM`, false)
    .option(`--hours-back <hours>`, `Only vacuum instances with db mtime within N hours`)
    .action(async ({ dryRun, hoursBack }: { dryRun: boolean; hoursBack?: string }) => {
      logger().context({ cli: 'edge:vacuum' })
      const { info } = logger()
      info(`Starting`)
      const { vacuumAll } = await import(`./vacuum`)
      await vacuumAll({
        dryRun,
        hoursBack: hoursBack != null ? Number(hoursBack) : undefined,
      })
      info(`Done`)
    })
  return cmd
}
