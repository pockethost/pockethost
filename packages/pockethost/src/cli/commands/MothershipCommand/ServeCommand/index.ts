import { LoggerService, neverendingPromise } from '@'
import { Command } from 'commander'
import { mothership } from './mothership'

type Options = {
  isolate: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`)
    .description(`Run the PocketHost mothership`)
    .option(`--isolate`, `Use Docker for process isolation.`, false)
    .action(async (options: Options) => {
      const logger = LoggerService().create(`cli:mothership:serve`)
      const { dbg } = logger
      dbg({ options })
      await mothership(options)
      await neverendingPromise(logger)
    })
  return cmd
}
