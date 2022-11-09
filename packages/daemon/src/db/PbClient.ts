import { Knex } from 'knex'
import {
  Collection,
  default as PocketBase,
  default as pocketbaseEs,
} from 'pocketbase'
import { DAEMON_PB_DATA_DIR, PUBLIC_PB_SUBDOMAIN } from '../constants'
import { Collection_Serialized } from '../migrate/schema'
import { safeCatch } from '../util/safeAsync'
import { createBackupMixin } from './BackupMixin'
import { createInstanceMixin } from './InstanceMIxin'
import { createInvocationMixin } from './InvocationMixin'
import { createJobMixin } from './JobMixin'
import { createRawPbClient } from './RawPbClient'

export type PocketbaseClientApi = ReturnType<typeof createPbClient>

export type MixinContext = { client: pocketbaseEs; rawDb: Knex }

export const createPbClient = (url: string) => {
  console.log(`Initializing client: ${url}`)
  const rawDb = createRawPbClient(
    `${DAEMON_PB_DATA_DIR}/${PUBLIC_PB_SUBDOMAIN}/pb_data/data.db`
  )

  const client = new PocketBase(url)
  client.beforeSend = (url: string, reqConfig: { [_: string]: any }) => {
    // dbg(reqConfig)
    delete reqConfig.signal
    return reqConfig
  }

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
  const jobsApi = createJobMixin(context)
  const instanceApi = createInstanceMixin(context)
  const backupApi = createBackupMixin(context)
  const invocationApi = createInvocationMixin(context, instanceApi)

  const api = {
    adminAuthViaEmail,
    applySchema,
    ...jobsApi,
    ...instanceApi,
    ...invocationApi,
    ...backupApi,
  }

  return api
}
