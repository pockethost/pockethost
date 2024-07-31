import { Command } from 'commander'
import { schema } from './schema'

export const SchemaCommand = () => {
  const cmd = new Command(`schema`)
    .description(`Create  snapshot of the current PocketHost mothership schema`)
    .action(async (options) => {
      await schema()
    })
  return cmd
}
