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

const AUTH_RETRY_INITIAL_MS = 1000
const AUTH_RETRY_MAX_MS = 30000

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

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

  let retryMs = AUTH_RETRY_INITIAL_MS

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
        break
      } catch (e) {
        error(`CANNOT AUTHENTICATE TO ${url}, retrying in ${retryMs}ms`)
        await sleep(retryMs)
        retryMs = Math.min(retryMs * 2, AUTH_RETRY_MAX_MS)
      }
    }
  }

  return {
    client,
  }
})
