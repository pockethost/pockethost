import { logger } from '@'
import { Command } from 'commander'
import { ServeCommand } from './ServeCommand'

type Options = {
  debug: boolean
}

export const FirewallCommand = () => {
  const cmd = new Command(`firewall`)
    .description(`Root firewall commands`)
    .addCommand(ServeCommand())
    .action(() => {
      logger().context({ cli: 'firewall' })
      cmd.help()
    })
  return cmd
}
