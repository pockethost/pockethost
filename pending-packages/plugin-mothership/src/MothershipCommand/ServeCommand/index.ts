import { Command } from 'pockethost/core'
import { mothership } from './mothership'

type Options = {
  isolate: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`)
    .description(`Run the PocketHost mothership`)
    .option(`--isolate`, `Use Docker for process isolation.`, false)
    .action(async (options: Options) => {
      console.log({ options })
      await mothership(options)
    })
  return cmd
}
