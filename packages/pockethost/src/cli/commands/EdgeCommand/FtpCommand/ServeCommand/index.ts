import { Command } from 'commander'
import { ftp } from './ftp'

type Options = {
  debug: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`)
    .description(`Run an edge FTP server`)
    .action(async (options: Options) => {
      await ftp()
    })
  return cmd
}
