import {
  assertExists,
  InstanceId,
  InstancesRecord,
  InstanceStatus,
  InvocationRecord,
  JobRecord,
  JobStatus,
  pocketNow,
  UserRecord,
} from '@pockethost/common'
import { reduce } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { endOfMonth, startOfMonth } from 'date-fns'
import PocketBase, { Collection, RecordSubscriptionAction } from 'pocketbase'
import { DAEMON_PB_DATA_DIR, PUBLIC_PB_SUBDOMAIN } from '../constants'
import { Collection_Serialized } from '../migrate/schema'
import { dbg } from '../util/dbg'
import { safeCatch } from '../util/safeAsync'
import { createRawPbClient } from './RawPbClient'

export type PocketbaseClientApi = ReturnType<typeof createPbClient>

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

  const getInstanceBySubdomain = safeCatch(
    `getInstanceBySubdomain`,
    (subdomain: string): Promise<[InstancesRecord, UserRecord] | []> =>
      client
        .collection('instances')
        .getFirstListItem<InstancesRecord>(`subdomain = '${subdomain}'`)
        .then((instance) => {
          if (!instance) return []
          return client
            .collection('users')
            .getOne<UserRecord>(instance.uid)
            .then((user) => {
              return [instance, user]
            })
        })
  )

  const updateInstance = safeCatch(
    `updateInstance`,
    async (instanceId: InstanceId, fields: Partial<InstancesRecord>) => {
      await client.collection('instances').update(instanceId, fields)
    }
  )

  const updateInstanceStatus = safeCatch(
    `updateInstanceStatus`,
    async (instanceId: InstanceId, status: InstanceStatus) => {
      await updateInstance(instanceId, { status })
    }
  )

  const createInvocation = safeCatch(
    `createInvocation`,
    async (instance: InstancesRecord, pid: number) => {
      const init: Partial<InvocationRecord> = {
        startedAt: pocketNow(),
        pid,
        instanceId: instance.id,
        totalSeconds: 0,
      }
      const _inv = await client
        .collection('invocations')
        .create<InvocationRecord>(init)
      return _inv
    }
  )

  const pingInvocation = safeCatch(
    `pingInvocation`,
    async (invocation: InvocationRecord) => {
      const totalSeconds =
        (+new Date() - Date.parse(invocation.startedAt)) / 1000
      const toUpdate: Partial<InvocationRecord> = {
        totalSeconds,
      }
      const _inv = await client
        .collection('invocations')
        .update<InvocationRecord>(invocation.id, toUpdate)
      await updateInstanceSeconds(invocation.instanceId)
      return _inv
    }
  )

  const finalizeInvocation = safeCatch(
    `finalizeInvocation`,
    async (invocation: InvocationRecord) => {
      dbg('finalizing')
      const totalSeconds =
        (+new Date() - Date.parse(invocation.startedAt)) / 1000
      const toUpdate: Partial<InvocationRecord> = {
        endedAt: pocketNow(),
        totalSeconds,
      }
      dbg({ toUpdate })
      const _inv = await client
        .collection('invocations')
        .update<InvocationRecord>(invocation.id, toUpdate)
      await updateInstanceSeconds(invocation.instanceId)
      return _inv
    }
  )

  const updateInstanceSeconds = safeCatch(
    `updateInstanceSeconds`,
    async (instanceId: InstanceId, forPeriod = new Date()) => {
      const startIso = startOfMonth(forPeriod).toISOString()
      const endIso = endOfMonth(forPeriod).toISOString()
      const query = rawDb('invocations')
        .sum('totalSeconds as t')
        .where('instanceId', instanceId)
        .where('startedAt', '>=', startIso)
        .where('startedAt', '<=', endIso)
      dbg(query.toString())
      const res = await query
      const [row] = res
      assertExists(row, `Expected row here`)
      const secondsThisMonth = row.t
      await updateInstance(instanceId, { secondsThisMonth })
    }
  )

  const applySchema = safeCatch(
    `applySchema`,
    async (collections: Collection_Serialized[]) => {
      await client.collections.import(collections as Collection[])
    }
  )

  const updateInstances = safeCatch(
    'updateInstances',
    async (cb: (rec: InstancesRecord) => Partial<InstancesRecord>) => {
      const res = await client
        .collection('instances')
        .getFullList<InstancesRecord>(200)
      const limiter = new Bottleneck({ maxConcurrent: 1 })
      const promises = reduce(
        res,
        (c, r) => {
          c.push(
            limiter.schedule(() => {
              const toUpdate = cb(r)
              dbg(`Updating instnace ${r.id} with ${JSON.stringify(toUpdate)}`)
              return client.collection('instances').update(r.id, toUpdate)
            })
          )
          return c
        },
        [] as Promise<void>[]
      )
      await Promise.all(promises)
    }
  )

  const onNewJob = safeCatch(
    `onNewJob`,
    async (cb: (e: JobRecord<any>) => void) => {
      const unsub = await client
        .collection('jobs')
        .subscribe<JobRecord<any>>('*', (e) => {
          if (e.action !== RecordSubscriptionAction.Create) return
          cb(e.record)
        })
      return unsub
    }
  )

  const resetJobs = safeCatch(`resetJobs`, async () =>
    rawDb('jobs')
      .whereNotIn('status', [
        JobStatus.FinishedError,
        JobStatus.FinishedSuccess,
      ])
      .update({
        status: JobStatus.New,
      })
  )

  const incompleteJobs = safeCatch(`incompleteJobs`, async () => {
    return client.collection('jobs').getFullList<JobRecord<any>>(100, {
      filter: `status != '${JobStatus.FinishedError}' && status != '${JobStatus.FinishedSuccess}'`,
    })
  })

  return {
    pingInvocation,
    finalizeInvocation,
    createInvocation,
    adminAuthViaEmail,
    getInstanceBySubdomain,
    updateInstanceStatus,
    updateInstance,
    applySchema,
    updateInstances,
    onNewJob,
    resetJobs,
    incompleteJobs,
  }
}
