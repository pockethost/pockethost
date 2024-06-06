import { Command } from 'commander'
import { DaemonCommand } from './DaemonCommand'
import { FtpCommand } from './FtpCommand'
import { SyslogCommand } from './SyslogCommand'

type Options = {
  debug: boolean
}

export const EdgeCommand = () => {
  const cmd = new Command(`edge`).description(`Edge commands`)

  cmd
    .addCommand(DaemonCommand())
    .addCommand(FtpCommand())
    .addCommand(SyslogCommand())
  return cmd
}
