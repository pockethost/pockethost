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

  while (true) {
    try {
      await client.adminAuthViaEmail(username, password)
      dbg(`Logged in as admin`)
      break
    } catch (e) {
      dbg(`Creating first admin account`)

      try {
        await client.createFirstAdmin(username, password)
        await client.adminAuthViaEmail(username, password)
        dbg(`Logged in`)
      } catch (e) {
        error(`CANNOT AUTHENTICATE TO ${url}`)
      }
    }
  }

  return {
    client,
    shutdown() {
      dbg(`clientService shutdown`)
    },
  }
})
