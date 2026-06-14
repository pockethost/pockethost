import { logger } from '@'
import { Command } from 'commander'

type Options = {
  debug: boolean
}

export const HealthCommand = () => {
  const cmd = new Command(`health`)
    .addCommand(
      new Command(`check`)
        .description(`Run edge health checks and post status to Discord`)
        .action(async (options: Options) => {
          logger().context({ cli: 'health:check' })
          const { dbg, error, info, warn } = logger()
          info(`Starting`)
          const { checkHealth } = await import(`./checkHealth`)
          await checkHealth()
        })
    )
    .addCommand(
      new Command(`compact`)
        .description(`VACUUM idle instance and local Mothership SQLite databases; posts summary to Discord health channel`)
        .option(`--dry-run`, `Report databases that would be vacuumed without running VACUUM`, false)
        .action(async ({ dryRun }: { dryRun: boolean }) => {
          logger().context({ cli: 'health:compact' })
          const { info } = logger()
          info(`Starting`)
          const { compact } = await import(`./compact`)
          await compact({ dryRun })
        })
    )
    .action(() => {
      cmd.help()
    })
  return cmd
}
