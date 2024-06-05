import {
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_URL,
} from '$constants'
import { Logger, LoggerService, mkSingleton } from '$shared'
import { mergeConfig } from '$util'
import PocketBase from 'pocketbase'
import { createAdminPbClient } from './createAdminPbClient'

export type ClientServiceConfig = {
  url: string
  username: string
  password: string
}

export type MixinContext = {
  client: PocketBase
  logger: Logger
}

export const MothershipAdminClientService = mkSingleton(
  async (cfg: Partial<ClientServiceConfig> = {}) => {
    const { url, username, password } = mergeConfig<ClientServiceConfig>(
      {
        url: MOTHERSHIP_URL(),
        username: MOTHERSHIP_ADMIN_USERNAME(),
        password: MOTHERSHIP_ADMIN_PASSWORD(),
      },
      cfg,
    )
    const _clientLogger = LoggerService().create(`client singleton`)
    const { dbg, error } = _clientLogger
    const client = createAdminPbClient(url)

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
    }
  },
)
