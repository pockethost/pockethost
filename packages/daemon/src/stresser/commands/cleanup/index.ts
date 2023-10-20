import { DAEMON_PB_PASSWORD, DAEMON_PB_USERNAME } from '$constants'
import { clientService } from '$services'
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

      await clientService({
        url: options.mothershipUrl,
        username: DAEMON_PB_USERNAME,
        password: DAEMON_PB_PASSWORD,
      })

      await deleteInstancesByFilter(`subdomain ~ '${filter}'`)
    })
}
