import { Command } from 'commander'
import { ServeCommand } from './ServeCommand'

type Options = {
  debug: boolean
}

export const FirewallCommand = () => {
  const cmd = new Command(`firewall`)
    .description(`Root firewall commands`)
    .addCommand(ServeCommand())
  return cmd
}
