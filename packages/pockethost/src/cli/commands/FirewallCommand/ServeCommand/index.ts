import { LoggerService, neverendingPromise } from '@'
import { Command } from 'commander'
import { firewall } from './firewall/server'

type Options = {
  debug: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`).description(`Serve the root firewall`).action(async (options: Options) => {
    const logger = LoggerService().create(`cli:firewall:serve`)
    const { info, warn } = logger
    info(`Starting`)
    await firewall({ logger })
    await neverendingPromise(logger)
  })
  return cmd
}
