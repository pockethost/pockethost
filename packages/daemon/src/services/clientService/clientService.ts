import {
  DAEMON_PB_PASSWORD,
  DAEMON_PB_USERNAME,
  PUBLIC_APP_DB,
  PUBLIC_APP_DOMAIN,
  PUBLIC_APP_PROTOCOL,
} from '$constants'
import { Logger, mkSingleton } from '@pockethost/common'
import { createPbClient } from './PbClient'

export type ClientServiceConfig = {
  logger: Logger
  url: string
}

export const clientService = mkSingleton(async (cfg: ClientServiceConfig) => {
  const { logger, url } = cfg
  const _clientLogger = logger.create(`client singleton`)
  const { dbg, error } = _clientLogger
  const client = createPbClient(url, _clientLogger)

  try {
    await client.adminAuthViaEmail(DAEMON_PB_USERNAME, DAEMON_PB_PASSWORD)
    dbg(`Logged in as admin`)
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

  return {
    client,
    shutdown() {
      dbg(`clientService shutdown`)
    },
  }
})
