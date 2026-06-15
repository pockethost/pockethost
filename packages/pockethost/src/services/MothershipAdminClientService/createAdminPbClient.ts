import {
  GetUserTokenPayload,
  GetUserTokenPayloadSchema,
  GetUserTokenResult,
  Logger,
  PocketBase,
  RestCommands,
  RestMethods,
  adminAuthWithPassword,
  createFirstAdmin as createFirstAdminRecord,
  createRestHelper,
} from '@'
import { MixinContext } from '.'
import { createInstanceMixin } from './InstanceMIxin'

export type PocketbaseClientApi = ReturnType<typeof createAdminPbClient>

export const createAdminPbClient = (url: string, logger: Logger) => {
  const _clientLogger = logger.create('PbClient')
  const { info } = _clientLogger

  info(`Initializing client: ${url}`)

  const client = new PocketBase(url)
  client.autoCancellation(false)

  const adminAuthViaEmail = (email: string, password: string) => adminAuthWithPassword(client, email, password)

  const createFirstAdmin = (email: string, password: string) => createFirstAdminRecord(client, email, password)

  const context: MixinContext = { client, logger: _clientLogger }
  const instanceApi = createInstanceMixin(context)

  const restHelper = createRestHelper({ client })
  const { mkRest } = restHelper

  const getUserTokenInfo = mkRest<GetUserTokenPayload, GetUserTokenResult>(
    RestCommands.UserToken,
    RestMethods.Get,
    GetUserTokenPayloadSchema
  )

  const api = {
    client,
    url,
    createFirstAdmin,
    adminAuthViaEmail,
    getUserTokenInfo,
    ...instanceApi,
  }

  return api
}
