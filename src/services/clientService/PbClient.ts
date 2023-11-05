import { mkInstanceDataPath, MOTHERSHIP_NAME } from '$constants'
import { Logger, LoggerService } from '$shared'
import { Knex } from 'knex'
import { default as PocketBase, default as pocketbaseEs } from 'pocketbase'
import { createInstanceMixin } from './InstanceMIxin'
import { createRawPbClient } from './RawPbClient'

export type PocketbaseClientApi = ReturnType<typeof createPbClient>

export type MixinContext = { client: pocketbaseEs; rawDb: Knex; logger: Logger }

export const createPbClient = (url: string) => {
  const _clientLogger = LoggerService().create('PbClient')
  const { info } = _clientLogger

  info(`Initializing client: ${url}`)
  const rawDb = createRawPbClient(
    mkInstanceDataPath(MOTHERSHIP_NAME(), `pb_data`, `data.db`),
    _clientLogger,
  )

  const client = new PocketBase(url)
  client.autoCancellation(false)

  const adminAuthViaEmail = (email: string, password: string) =>
    client.admins.authWithPassword(email, password)

  const createFirstAdmin = (email: string, password: string) =>
    client.admins
      .create({ email, password, passwordConfirm: password })
      .catch((res) => {
        console.log({ email, password })
        console.log(JSON.stringify(res, null, 2))
        return res
      })

  const context: MixinContext = { client, rawDb, logger: _clientLogger }
  const instanceApi = createInstanceMixin(context)

  const api = {
    client,
    url,
    knex: rawDb,
    createFirstAdmin,
    adminAuthViaEmail,
    ...instanceApi,
  }

  return api
}
