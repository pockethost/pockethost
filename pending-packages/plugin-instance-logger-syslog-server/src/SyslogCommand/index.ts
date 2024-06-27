import { Command } from 'pockethost/core'
import { ServeCommand } from './ServeCommand'

type Options = {
  debug: boolean
}

export const SyslogCommand = () => {
  const cmd = new Command(`syslog`)
    .description(`Syslog commands`)
    .addCommand(ServeCommand())
  return cmd
}
