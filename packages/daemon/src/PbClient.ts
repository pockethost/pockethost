import { InstancesRecord, InstanceStatus, UserRecord } from '@pockethost/common'
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
        .getList<InstancesRecord>(1, 1, {
          filter: `subdomain = '${subdomain}'`,
        })
        .then((recs) => {
          if (recs.totalItems > 1) {
            throw new Error(
              `Expected just one or zero instance records for ${subdomain}`
            )
          }
          const [instance] = recs.items
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
      await client.collection('instances').update(instance.id, { status })
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
    adminAuthViaEmail,
    getInstanceBySubdomain,
    updateInstanceStatus,
    migrate,
    updateInstances,
  }
}
