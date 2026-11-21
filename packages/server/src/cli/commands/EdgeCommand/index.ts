import { Command } from 'commander'
import { ArchiveCommand } from './ArchiveCommand'
import { DiskUsageCommand } from './DiskUsageCommand'
import { FtpCommand } from './FtpCommand'
import { OverLimitCommand } from './OverLimitCommand'
import { PurgeOrphansCommand } from './PurgeOrphansCommand'
import { VacuumCommand } from './VacuumCommand'

type Options = {
  debug: boolean
}

export const EdgeCommand = () => {
  const cmd = new Command(`edge`).description(`Edge commands`)

  cmd
    .addCommand(PurgeOrphansCommand())
    .addCommand(ArchiveCommand())
    .addCommand(VacuumCommand())
    .addCommand(DiskUsageCommand())
    .addCommand(OverLimitCommand())
    .addCommand(FtpCommand())
    .action(() => {
      cmd.help()
    })
  return cmd
}
