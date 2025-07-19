import { logger, neverendingPromise } from '@'
import { Command } from 'commander'
import { daemon } from '../EdgeCommand/DaemonCommand/ServeCommand/daemon'
import { firewall } from '../FirewallCommand/ServeCommand/firewall/server'
import { mothership } from '../MothershipCommand/ServeCommand/mothership'

type Options = {
  isolate: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`).description(`Run the entire PocketHost stack`).action(async (options: Options) => {
    logger().context({ cli: 'serve' })
    const { dbg, error, info, warn } = logger()
    info(`Starting`)

    await Promise.all([mothership(options), daemon(), firewall()])

    await neverendingPromise()
  })
  return cmd
}
