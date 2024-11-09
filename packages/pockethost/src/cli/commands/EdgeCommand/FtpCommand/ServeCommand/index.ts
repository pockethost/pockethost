import { Command } from 'commander'
import { logger } from '../../../../../../common'
import { ftp } from './ftp'

type Options = {
  debug: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`)
    .description(`Run an edge FTP server`)
    .action(async (options: Options) => {
      logger().context({ cli: 'edge:ftp:serve' })
      await ftp()
    })
  return cmd
}
