import {
  GetUserTokenPayload,
  GetUserTokenPayloadSchema,
  GetUserTokenResult,
  LoggerService,
  PocketBase,
  RestCommands,
  RestMethods,
  createRestHelper,
  stringify,
} from '$public'
import { MixinContext } from '.'
import { createInstanceMixin } from './InstanceMIxin'

export type PocketbaseClientApi = ReturnType<typeof createAdminPbClient>

export const createAdminPbClient = (url: string) => {
  const _clientLogger = LoggerService().create('PbClient')
  const { info } = _clientLogger

  info(`Initializing client: ${url}`)

  const client = new PocketBase(url)
  client.autoCancellation(false)

  const adminAuthViaEmail = (email: string, password: string) =>
    client.admins.authWithPassword(email, password)

  const createFirstAdmin = (email: string, password: string) =>
    client.admins
      .create({ email, password, passwordConfirm: password })
      .catch((res) => {
        console.log({ email, password })
        console.log(stringify(res, null, 2))
        return res
      })

  const context: MixinContext = { client, logger: _clientLogger }
  const instanceApi = createInstanceMixin(context)

  const restHelper = createRestHelper({ client })
  const { mkRest } = restHelper

  const getUserTokenInfo = mkRest<GetUserTokenPayload, GetUserTokenResult>(
    RestCommands.UserToken,
    RestMethods.Get,
    GetUserTokenPayloadSchema,
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
