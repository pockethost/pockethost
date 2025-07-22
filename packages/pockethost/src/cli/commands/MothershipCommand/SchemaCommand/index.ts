import { LoggerService } from '@'
import { Command } from 'commander'
import { schema } from './schema'

export const SchemaCommand = () => {
  const cmd = new Command(`schema`)
    .description(`Create  snapshot of the current PocketHost mothership schema`)
    .action(async (options) => {
      const logger = LoggerService().create(`cli:mothership:schema`)
      await schema({ logger })
    })
  return cmd
}
