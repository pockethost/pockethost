import { Command } from 'commander'
import { ServeCommand } from './ServeCommand'

type Options = {
  debug: boolean
}

export const FtpCommand = () => {
  const cmd = new Command(`ftp`)
    .description(`FTP commands`)
    .addCommand(ServeCommand())
  return cmd
}
