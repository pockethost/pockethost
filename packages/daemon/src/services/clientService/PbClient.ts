import { DAEMON_PB_DATA_DIR, PUBLIC_APP_DB } from '$constants'
import { logger, safeCatch } from '@pockethost/common'
import { Knex } from 'knex'
import {
  Collection,
  default as PocketBase,
  default as pocketbaseEs,
} from 'pocketbase'
import { Collection_Serialized } from '../../migrate/schema'
import { createBackupMixin } from './BackupMixin'
import { createInstanceMixin } from './InstanceMIxin'
import { createInvocationMixin } from './InvocationMixin'
import { createRawPbClient } from './RawPbClient'
import { createRpcHelper } from './RpcHelper'

export type PocketbaseClientApi = ReturnType<typeof createPbClient>

export type MixinContext = { client: pocketbaseEs; rawDb: Knex }

export const createPbClient = (url: string) => {
  const { info } = logger().create('PbClient')

  info(`Initializing client: ${url}`)
  const rawDb = createRawPbClient(
    `${DAEMON_PB_DATA_DIR}/${PUBLIC_APP_DB}/pb_data/data.db`
  )

  const client = new PocketBase(url)

  const adminAuthViaEmail = safeCatch(
    `adminAuthViaEmail`,
    (email: string, password: string) =>
      client.admins.authWithPassword(email, password)
  )

  const createFirstAdmin = safeCatch(
    `createFirstAdmin`,
    (email: string, password: string) => client.admins.create(email, password)
  )

  const applySchema = safeCatch(
    `applySchema`,
    async (collections: Collection_Serialized[]) => {
      await client.collections.import(collections as Collection[])
    }
  )

  const context: MixinContext = { client, rawDb }
  const rpcApi = createRpcHelper(context)
  const instanceApi = createInstanceMixin(context)
  const backupApi = createBackupMixin(context)
  const invocationApi = createInvocationMixin(context, instanceApi)

  const api = {
    client,
    url,
    knex: rawDb,
    createFirstAdmin,
    adminAuthViaEmail,
    applySchema,
    ...rpcApi,
    ...instanceApi,
    ...invocationApi,
    ...backupApi,
  }

  return api
}
