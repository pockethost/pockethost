import { Command } from 'commander'
import { DaemonCommand } from './DaemonCommand'
import { FtpCommand } from './FtpCommand'

type Options = {
  debug: boolean
}

export const EdgeCommand = () => {
  const cmd = new Command(`edge`).description(`Edge commands`)

  cmd
    .addCommand(DaemonCommand())
    .addCommand(FtpCommand())
    .action(() => {
      cmd.help()
    })
  return cmd
}
