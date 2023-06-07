import {
  DAEMON_PB_PASSWORD,
  DAEMON_PB_USERNAME,
  PUBLIC_APP_DB,
  PUBLIC_APP_DOMAIN,
  PUBLIC_APP_PROTOCOL,
} from '$constants'
import { schema } from '$src/migrate/schema'
import { logger, mkSingleton } from '@pockethost/common'
import { createPbClient } from './PbClient'

export const clientService = mkSingleton(async (url: string) => {
  const { dbg, error } = logger().create(`client singleton`)
  const client = createPbClient(url)

  try {
    await client.adminAuthViaEmail(DAEMON_PB_USERNAME, DAEMON_PB_PASSWORD)
    dbg(`Logged in`)
  } catch (e) {
    dbg(`Creating first admin account`)

    try {
      await client.createFirstAdmin(DAEMON_PB_USERNAME, DAEMON_PB_PASSWORD)
      await client.adminAuthViaEmail(DAEMON_PB_USERNAME, DAEMON_PB_PASSWORD)
      dbg(`Logged in`)
    } catch (e) {
      error(
        `CANNOT AUTHENTICATE TO ${PUBLIC_APP_PROTOCOL}://${PUBLIC_APP_DB}.${PUBLIC_APP_DOMAIN}/_/`
      )
      process.exit(-1)
    }
  }

  try {
    dbg(`Applying schema`)
    await client.applySchema(schema)
    dbg(`Schema applied`)
  } catch (e) {
    error(`Failed to apply base migration schema`)
    process.exit(-1)
  }

  return {
    client,
    shutdown() {
      dbg(`clientService shutdown`)
    },
  }
})
