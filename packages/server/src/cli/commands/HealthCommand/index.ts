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
          const { info } = logger()
          info(`Starting`)
          const { checkHealth } = await import(`./checkHealth`)
          await checkHealth()
        })
    )
    .action(() => {
      cmd.help()
    })
  return cmd
}
