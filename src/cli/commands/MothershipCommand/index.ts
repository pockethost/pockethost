import { Command } from 'commander'
import { ServeCommand } from './ServeCommand'

type Options = {
  debug: boolean
}

export const MothershipCommand = () => {
  const cmd = new Command(`mothership`)
    .description(`Mothership commands`)
    .addCommand(ServeCommand())
  return cmd
}
