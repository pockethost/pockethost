import { Command } from 'commander'
import { CleanupCommand } from './CleanupCommand'
import { DaemonCommand } from './DaemonCommand'
import { FtpCommand } from './FtpCommand'

type Options = {
  debug: boolean
}

export const EdgeCommand = () => {
  const cmd = new Command(`edge`).description(`Edge commands`)

  cmd
    .addCommand(CleanupCommand())
    .addCommand(DaemonCommand())
    .addCommand(FtpCommand())
    .action(() => {
      cmd.help()
    })
  return cmd
}
