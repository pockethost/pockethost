import { LoggerService, neverendingPromise } from '@'
import { Command } from 'commander'
import { daemon } from '../EdgeCommand/DaemonCommand/ServeCommand/daemon'
import { firewall } from '../FirewallCommand/ServeCommand/firewall/server'
import { mothership } from '../MothershipCommand/ServeCommand/mothership'

export const ServeCommand = () => {
  const cmd = new Command(`serve`).description(`Run the entire PocketHost stack`).action(async () => {
    const logger = LoggerService().create(`cli:serve`)
    const { dbg, error, info, warn } = logger
    info(`Starting`)

    await mothership({ logger })
    dbg(`Mothership ready`)
    await daemon({ logger })
    dbg(`Daemon ready`)
    await firewall({ logger })
    dbg(`Firewall ready`)
    await neverendingPromise(logger)
  })
  return cmd
}
