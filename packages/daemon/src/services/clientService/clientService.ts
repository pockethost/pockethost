import { LoggerService, mkSingleton } from '@pockethost/common'
import { createPbClient } from './PbClient'

export type ClientServiceConfig = {
  url: string
  username: string
  password: string
}

export const clientService = mkSingleton(async (cfg: ClientServiceConfig) => {
  const { url, username, password } = cfg
  const _clientLogger = LoggerService().create(`client singleton`)
  const { dbg, error } = _clientLogger
  const client = createPbClient(url)

  try {
    await client.adminAuthViaEmail(username, password)
    dbg(`Logged in as admin`)
  } catch (e) {
    dbg(`Creating first admin account`)

    try {
      await client.createFirstAdmin(username, password)
      await client.adminAuthViaEmail(username, password)
      dbg(`Logged in`)
    } catch (e) {
      error(`CANNOT AUTHENTICATE TO ${url}`)
      throw e
    }
  }

  return {
    client,
    shutdown() {
      dbg(`clientService shutdown`)
    },
  }
})
