import { Command } from 'commander'
import { mothership } from './mothership'

type Options = {
  debug: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`)
    .description(`Run the PocketHost mothership`)
    .action(async (options: Options) => {
      await mothership()
    })
  return cmd
}
