import { Command } from 'commander'
import { ServeCommand } from './ServeCommand'

type Options = {
  debug: boolean
}

export const DaemonCommand = () => {
  const cmd = new Command(`daemon`)
    .description(`Daemon commands`)
    .addCommand(ServeCommand())
  return cmd
}
