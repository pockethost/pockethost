import { Knex } from 'knex'
import {
  Collection,
  default as PocketBase,
  default as pocketbaseEs,
} from 'pocketbase'
import { DAEMON_PB_DATA_DIR, PUBLIC_PB_SUBDOMAIN } from '../constants'
import { Collection_Serialized } from '../migrate/schema'
import { info } from '../util/logger'
import { safeCatch } from '../util/promiseHelper'
import { createBackupMixin } from './BackupMixin'
import { createInstanceMixin } from './InstanceMIxin'
import { createInvocationMixin } from './InvocationMixin'
import { createRawPbClient } from './RawPbClient'
import { createRpcHelper } from './RpcHelper'

export type PocketbaseClientApi = ReturnType<typeof createPbClient>

export type MixinContext = { client: pocketbaseEs; rawDb: Knex }

export const createPbClient = (url: string) => {
  info(`Initializing client: ${url}`)
  const rawDb = createRawPbClient(
    `${DAEMON_PB_DATA_DIR}/${PUBLIC_PB_SUBDOMAIN}/pb_data/data.db`
  )

  const client = new PocketBase(url)

  const adminAuthViaEmail = safeCatch(
    `adminAuthViaEmail`,
    (email: string, password: string) =>
      client.admins.authWithPassword(email, password)
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
    knex: rawDb,
    adminAuthViaEmail,
    applySchema,
    ...rpcApi,
    ...instanceApi,
    ...invocationApi,
    ...backupApi,
  }

  return api
}
