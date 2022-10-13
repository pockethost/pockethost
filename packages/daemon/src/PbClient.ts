import { InstanceStatus } from '@pockethost/common'
import PocketBase from 'pocketbase'

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
    (subdomain: string) =>
      client.records.getList(`instances`, 1, 1, {
        filter: `subdomain = '${subdomain}'`,
      })
  )

  const updateInstanceStatus = safeCatch(
    `updateInstanceStatus`,
    async (subdomain: string, status: InstanceStatus) => {
      const recs = await getInstanceBySubdomain(subdomain)
      if (recs.totalItems !== 1) {
        throw new Error(`Expected just one subdomain record for ${subdomain}`)
      }
      const [item] = recs.items
      if (!item) {
        throw new Error(`Expected item here for ${subdomain}`)
      }
      await client.records.update(`instances`, item.id, { status })
    }
  )

  return { adminAuthViaEmail, getInstanceBySubdomain, updateInstanceStatus }
}
