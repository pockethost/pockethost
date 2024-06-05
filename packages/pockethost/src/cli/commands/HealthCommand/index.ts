import { LoggerService } from '$shared'
import { Command } from 'commander'
import { checkHealth } from './checkHealth'

type Options = {
  debug: boolean
}

export const HealthCommand = () => {
  const cmd = new Command(`health`)
    .description(`Perform a health check on the PocketHost system`)
    .action(async (options: Options) => {
      const logger = LoggerService().create(`HealthCommand`)
      const { dbg, error, info, warn } = logger
      info(`Starting`)

      await checkHealth()
    })
  return cmd
}
