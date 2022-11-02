import { InstanceStatus } from '@pockethost/common'
import PocketBase, { Record, User } from 'pocketbase'
import { Collection_Serialized } from './migrations'

const safeCatch = <TIn extends any[], TOut>(
  name: string,
  cb: (...args: TIn) => Promise<TOut>
) => {
  return (...args: TIn) => {
    console.log(`${name}`)
    return cb(...args).catch((e: any) => {
      console.error(`${name} failed: ${e}`)
      throw e
    })
  }
}

export const createPbClient = (url: string) => {
  console.log(`Initializing client: ${url}`)
  const client = new PocketBase(url)

  const adminAuthViaEmail = safeCatch(
    `adminAuthViaEmail`,
    (email: string, password: string) =>
      client.admins.authViaEmail(email, password)
  )

  const getInstanceBySubdomain = safeCatch(
    `getInstanceBySubdomain`,
    (subdomain: string): Promise<[Record, User] | []> =>
      client.records
        .getList(`instances`, 1, 1, {
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
          return client.users.getOne(instance.uid).then((user) => {
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
      await client.records.update(`instances`, instance.id, { status })
    }
  )

  const migrate = safeCatch(
    `migrate`,
    async (collections: Collection_Serialized[]) => {
      await client.collections.import(collections)
    }
  )

  return {
    adminAuthViaEmail,
    getInstanceBySubdomain,
    updateInstanceStatus,
    migrate,
  }
}
