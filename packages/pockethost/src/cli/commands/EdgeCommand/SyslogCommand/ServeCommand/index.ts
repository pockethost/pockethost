import { Command } from 'commander'
import { logger } from '../../../../../../common'
import { syslog } from './syslog'

type Options = {
  debug: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`)
    .description(`Run an edge syslog server`)
    .action(async (options: Options) => {
      logger().context({ cli: 'edge:syslog:serve' })
      await syslog()
    })
  return cmd
}
