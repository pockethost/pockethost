import {
  DAEMON_PB_PASSWORD,
  DAEMON_PB_USERNAME,
  PUBLIC_APP_DB,
  PUBLIC_APP_DOMAIN,
  PUBLIC_APP_PROTOCOL,
} from '$constants'
import { logger, mkSingleton } from '@pockethost/common'
import { createPbClient } from './PbClient'

export const clientService = mkSingleton(async (url: string) => {
  const { dbg, error } = logger().create(`client singleton`)
  const client = createPbClient(url)
  try {
    await client.adminAuthViaEmail(DAEMON_PB_USERNAME, DAEMON_PB_PASSWORD)
    dbg(`Logged in`)
  } catch (e) {
    error(
      `***WARNING*** CANNOT AUTHENTICATE TO ${PUBLIC_APP_PROTOCOL}://${PUBLIC_APP_DB}.${PUBLIC_APP_DOMAIN}/_/`
    )
    error(`***WARNING*** LOG IN MANUALLY, ADJUST .env, AND RESTART DOCKER`)
  }
  return {
    client,
    shutdown() {
      dbg(`clientService shutdown`)
    },
  }
})
