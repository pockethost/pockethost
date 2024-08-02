import { Command } from 'commander'
import { MirrorCommand } from './MirrorCommand'
import { SchemaCommand } from './SchemaCommand'
import { ServeCommand } from './ServeCommand'

type Options = {
  debug: boolean
}

export const MothershipCommand = () => {
  const cmd = new Command(`mothership`)
    .description(`Mothership commands`)
    .addCommand(ServeCommand())
    .addCommand(SchemaCommand())
    .addCommand(MirrorCommand())

  return cmd
}
