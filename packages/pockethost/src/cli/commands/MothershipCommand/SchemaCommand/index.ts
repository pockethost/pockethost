import { Command } from 'commander'
import { logger } from '../../../../common'
import { schema } from './schema'

export const SchemaCommand = () => {
  const cmd = new Command(`schema`)
    .description(`Create  snapshot of the current PocketHost mothership schema`)
    .action(async (options) => {
      logger().context({ cli: 'mothership:schema' })
      await schema()
    })
  return cmd
}
