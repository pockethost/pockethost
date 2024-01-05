import {
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
} from '$constants'
import { MothershipAdminClientService } from '$services'
import { ContextBase, GlobalOptions } from '$src/stresser/types'
import { Command } from 'commander'
import { deleteInstancesByFilter } from './deleteInstance'

export type CleanupOptions = GlobalOptions & {
  filter: string
}
export const createCleanup = (context: { program: Command } & ContextBase) => {
  const { program } = context
  const logger = context.logger.create(`createCleanup`)

  const cleanupCmd = program.command('cleanup')
  cleanupCmd
    .description('Clean up stress artifacts from database')
    .option(
      `-f, --filter <filter>`,
      `Filter to use when deleting instances`,
      `stress-%`,
    )
    .action(async () => {
      const options = cleanupCmd.optsWithGlobals<CleanupOptions>()
      const { filter } = options

      const { dbg } = logger
      dbg({ options })

      if (!filter.startsWith(`stress-`)) {
        throw new Error(`Cleanup filter must begin with 'stress-'`)
      }

      await MothershipAdminClientService({
        url: options.mothershipUrl,
        username: MOTHERSHIP_ADMIN_USERNAME(),
        password: MOTHERSHIP_ADMIN_PASSWORD(),
      })

      await deleteInstancesByFilter(`subdomain ~ '${filter}'`)
    })
}
