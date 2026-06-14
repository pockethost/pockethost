import { Command } from 'commander'
import { ServeCommand } from './ServeCommand'

export const SftpCommand = () => {
  const cmd = new Command(`sftp`)
    .description(`SFTP file access for instance directories`)
    .addCommand(ServeCommand())
    .action(() => {
      cmd.help()
    })
  return cmd
}
