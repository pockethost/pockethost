import { Command } from 'commander'
import { syslog } from './syslog'

type Options = {
  debug: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`)
    .description(`Run an edge syslog server`)
    .action(async (options: Options) => {
      await syslog()
    })
  return cmd
}
