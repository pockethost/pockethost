import { clientService } from '$services'
import { ContextBase, GlobalOptions } from '$src/stresser/types'
import { Command } from 'commander'
import { deleteInstancesByFilter } from './deleteInstance'

export type CleanupOptions = GlobalOptions
export const createCleanup = (context: { program: Command } & ContextBase) => {
  const { program } = context
  const logger = context.logger.create(`createCleanup`)

  const cleanupCmd = program.command('cleanup')
  cleanupCmd
    .description('Clean up stress artifacts from database')
    .action(async () => {
      const options = cleanupCmd.optsWithGlobals<CleanupOptions>()

      const { client } = await clientService({
        url: options.mothershipUrl,
        logger,
      })

      await deleteInstancesByFilter(`subdomain ~ 'stress-%'`)
    })
}
