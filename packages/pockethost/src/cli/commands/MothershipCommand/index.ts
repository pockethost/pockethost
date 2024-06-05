import { Command } from 'commander'
import { ServeCommand } from './ServeCommand'
import { UpdateCommand } from './UpdateCommand'

type Options = {
  debug: boolean
}

export const MothershipCommand = () => {
  const cmd = new Command(`mothership`)
    .description(`Mothership commands`)
    .addCommand(ServeCommand())
    .addCommand(UpdateCommand())
  return cmd
}
