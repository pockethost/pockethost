import { Command } from 'commander'
import { startInstanceMirrorServer } from './server'

type Options = {
  debug: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`)
    .description(`Run an edge cache server`)
    .action(async (options: Options) => {
      await startInstanceMirrorServer()
    })
  return cmd
}
