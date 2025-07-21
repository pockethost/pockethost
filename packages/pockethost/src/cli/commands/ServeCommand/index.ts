import { LoggerService, neverendingPromise } from '@'
import { Command } from 'commander'
import { daemon } from '../EdgeCommand/DaemonCommand/ServeCommand/daemon'
import { firewall } from '../FirewallCommand/ServeCommand/firewall/server'
import { mothership } from '../MothershipCommand/ServeCommand/mothership'

type Options = {
  isolate: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`).description(`Run the entire PocketHost stack`).action(async (options: Options) => {
    const logger = LoggerService().create(`cli:serve`)
    const { dbg, error, info, warn } = logger
    info(`Starting`)

    await mothership(options)
    dbg(`Mothership ready`)
    await daemon()
    dbg(`Daemon ready`)
    await firewall()
    dbg(`Firewall ready`)
    await neverendingPromise(logger)
  })
  return cmd
}
