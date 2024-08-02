import { Command } from 'commander'
import { startMothershipMirrorServer } from './server'

type Options = {
  debug: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`)
    .description(`Run a mothership mirror`)
    .action(async (options: Options) => {
      await startMothershipMirrorServer()
    })
  return cmd
}
