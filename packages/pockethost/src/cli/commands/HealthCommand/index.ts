import { Command } from 'commander'
import { LoggerService } from '../../../../core'

type Options = {
  debug: boolean
}

export const HealthCommand = () => {
  const cmd = new Command(`health`)
    .addCommand(
      new Command(`check`)
        .description(`Perform a health check on the PocketHost system`)
        .action(async (options: Options) => {
          const logger = LoggerService().create(`HealthCommand`)
          const { dbg, error, info, warn } = logger
          info(`Starting`)
          const { checkHealth } = await import(`./checkHealth`)
          await checkHealth()
        }),
    )
    .addCommand(
      new Command(`compact`)
        .description(
          `Compact SQLite databases by removing old SHM and WAL files`,
        )
        .action(async (options: Options) => {
          const logger = LoggerService().create(`HealthCommand`)
          const { dbg, error, info, warn } = logger
          info(`Starting`)
          const { compact } = await import(`./compact`)
          await compact()
        }),
    )
    .action(() => {
      cmd.help()
    })
  return cmd
}
