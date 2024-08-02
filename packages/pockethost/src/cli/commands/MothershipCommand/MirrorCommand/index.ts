import { Command } from 'commander'
import { ServeCommand } from './ServeCommand'

type Options = {
  debug: boolean
}

export const MirrorCommand = () => {
  const cmd = new Command(`mirror`)
    .description(`Instance mirror commands`)
    .addCommand(ServeCommand())
  return cmd
}
