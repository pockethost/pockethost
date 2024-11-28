import { Command } from 'commander'
import fse from 'fs-extra'
import { MigrateCommand } from './MigrateCommand'
import { MountCommand } from './MountCommand'

const { moveSync } = fse

export const VolumeCommand = () => {
  const cmd = new Command(`volume`)
    .description(`Volume commands`)
    .addCommand(MountCommand())
    .addCommand(MigrateCommand())
    .action(() => {
      cmd.help()
    })
  return cmd
}
