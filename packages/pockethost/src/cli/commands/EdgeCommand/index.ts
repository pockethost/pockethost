import { Command } from 'commander'
import { DaemonCommand } from './DaemonCommand'
import { FtpCommand } from './FtpCommand'
import { VolumeCommand } from './VolumeCommand'

type Options = {
  debug: boolean
}

export const EdgeCommand = () => {
  const cmd = new Command(`edge`).description(`Edge commands`)

  cmd
    .addCommand(DaemonCommand())
    .addCommand(FtpCommand())
    .addCommand(VolumeCommand())
    .action(() => {
      cmd.help()
    })
  return cmd
}
