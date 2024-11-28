import { logger } from '@'
import { Command } from 'commander'
import { firewall } from './firewall/server'

type Options = {
  debug: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`)
    .description(`Serve the root firewall`)
    .action(async (options: Options) => {
      logger().context({ cli: 'firewall:serve' })
      await firewall()
    })
  return cmd
}
