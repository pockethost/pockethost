import {
  InstancesRecord,
  InstanceStatus,
  InvocationRecord,
  pocketNow,
  UserRecord,
} from '@pockethost/common'
import { reduce } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import PocketBase, { Collection } from 'pocketbase'
import { Collection_Serialized } from './migrate/migrations'
import { safeCatch } from './util/safeCatch'

export const createPbClient = (url: string) => {
  console.log(`Initializing client: ${url}`)
  const client = new PocketBase(url)

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

  const updateInstanceStatus = safeCatch(
    `updateInstanceStatus`,
    async (subdomain: string, status: InstanceStatus) => {
      const [instance, owner] = await getInstanceBySubdomain(subdomain)

      if (!instance) {
        throw new Error(`Expected item here for ${subdomain}`)
      }
      await client
        .collection('instances')
        .update<InstancesRecord>(instance.id, { status })
    }
  )

  const createInvocation = safeCatch(
    'createInvocation',
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
    'pingInvocation',
    async (invocation: InvocationRecord) => {
      const totalSeconds =
        (+new Date() - Date.parse(invocation.startedAt)) / 1000
      const toUpdate: Partial<InvocationRecord> = {
        totalSeconds,
      }
      const _inv = await client
        .collection('invocations')
        .update<InvocationRecord>(invocation.id, toUpdate)
      return _inv
    }
  )

  const finalizeInvocation = safeCatch(
    'finalizeInvocation',
    async (invocation: InvocationRecord) => {
      const totalSeconds =
        (+new Date() - Date.parse(invocation.startedAt)) / 1000
      const toUpdate: Partial<InvocationRecord> = {
        endedAt: pocketNow(),
        totalSeconds,
      }
      const _inv = await client
        .collection('invocations')
        .update<InvocationRecord>(invocation.id, toUpdate)
      return _inv
    }
  )

  const migrate = safeCatch(
    `migrate`,
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
              console.log(
                `Updating instnace ${r.id} with ${JSON.stringify(toUpdate)}`
              )
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

  return {
    pingInvocation,
    finalizeInvocation,
    createInvocation,
    adminAuthViaEmail,
    getInstanceBySubdomain,
    updateInstanceStatus,
    migrate,
    updateInstances,
  }
}
