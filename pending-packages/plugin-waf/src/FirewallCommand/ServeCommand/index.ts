import { Command } from 'pockethost/core'
import { firewall } from './firewall/server'

type Options = {
  debug: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`)
    .description(`Start the WAF server`)
    .action(async (options: Options) => {
      await firewall()
    })
  return cmd
}
