import { Command } from 'commander'
import { DaemonCommand } from './DaemonCommand'
import { FtpCommand } from './FtpCommand'
import { PurgeOrphansCommand } from './PurgeOrphansCommand'
import { VacuumCommand } from './VacuumCommand'

type Options = {
  debug: boolean
}

export const EdgeCommand = () => {
  const cmd = new Command(`edge`).description(`Edge commands`)

  cmd
    .addCommand(PurgeOrphansCommand())
    .addCommand(VacuumCommand())
    .addCommand(DaemonCommand())
    .addCommand(FtpCommand())
    .action(() => {
      cmd.help()
    })
  return cmd
}
