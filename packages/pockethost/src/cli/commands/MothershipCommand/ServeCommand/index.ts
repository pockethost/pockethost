import { LoggerService, neverendingPromise } from '@'
import { Command } from 'commander'
import { mothership } from './mothership'

export const ServeCommand = () => {
  const cmd = new Command(`serve`).description(`Run the PocketHost mothership`).action(async () => {
    const logger = LoggerService().create(`cli:mothership:serve`)
    const { dbg } = logger
    await mothership({ logger })
    await neverendingPromise(logger)
  })
  return cmd
}
