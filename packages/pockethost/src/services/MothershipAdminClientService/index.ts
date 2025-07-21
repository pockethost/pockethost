import {
  Logger,
  LoggerService,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_URL,
  PocketBase,
  SingletonBaseConfig,
  mergeConfig,
  mkSingleton,
} from '@'
import { createAdminPbClient } from './createAdminPbClient'

export type ClientServiceConfig = SingletonBaseConfig & {
  url: string
  username: string
  password: string
  logger: Logger
}

export type MixinContext = {
  client: PocketBase
  logger: Logger
}

export const MothershipAdminClientService = mkSingleton(async (cfg: ClientServiceConfig) => {
  const { url, username, password, logger } = mergeConfig<ClientServiceConfig>(
    {
      url: MOTHERSHIP_URL(),
      username: MOTHERSHIP_ADMIN_USERNAME(),
      password: MOTHERSHIP_ADMIN_PASSWORD(),
      logger: LoggerService(),
    },
    cfg
  )
  const { dbg, error } = logger.create(`MothershipAdminClientService`)
  const client = createAdminPbClient(url, logger)

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
})
