import {
  EDGE_APEX_DOMAIN,
  InstanceFields,
  InstanceId,
  LoggerService,
  mkSingleton,
  PocketBase,
  SingletonBaseConfig,
  UserFields,
  UserId,
} from '@'
import { forEach } from '@s-libs/micro-dash'

export type MothershipMirrorServiceConfig = SingletonBaseConfig & {
  client: PocketBase
}

export const MothershipMirrorService = mkSingleton(async (config: MothershipMirrorServiceConfig) => {
  const { dbg, error } = LoggerService().create(`MothershipMirrorService`)

  const client = config.client

  const mirror: {
    users: { [_: UserId]: UserFields }
    instancesById: { [_: InstanceId]: InstanceFields }
    instancesByCanonicalId: { [_: string]: InstanceFields }
    instancesByCanonicalSubdomain: { [_: string]: InstanceFields }
    instancesBySubdomain: { [_: string]: InstanceFields }
    instancesByCname: { [_: string]: InstanceFields }
  } = {
    users: {},
    instancesById: {},
    instancesByCanonicalId: {},
    instancesByCanonicalSubdomain: {},
    instancesBySubdomain: {},
    instancesByCname: {},
  }

  client.collection(`instances`).subscribe<InstanceFields>(`*`, (e) => {
    const deleteInstance = (id: InstanceId) => {
      const oldInstance = mirror.instancesById[id]
      if (oldInstance) {
        const canonicalId = `${oldInstance.id}.${EDGE_APEX_DOMAIN()}`
        const canonicalSubdomain = `${oldInstance.subdomain}.${EDGE_APEX_DOMAIN()}`
        delete mirror.instancesById[canonicalId]
        delete mirror.instancesBySubdomain[canonicalSubdomain]
        delete mirror.instancesByCname[oldInstance.cname]
        delete mirror.instancesByCanonicalId[canonicalId]
        delete mirror.instancesByCanonicalSubdomain[canonicalSubdomain]
      }
    }
    const { action, record } = e
    if (action === `create` || action === `update`) {
      dbg(`instance`, { action, record })
      deleteInstance(record.id)
      const canonicalId = `${record.id}.${EDGE_APEX_DOMAIN()}`
      const canonicalSubdomain = `${record.subdomain}.${EDGE_APEX_DOMAIN()}`
      mirror.instancesById[record.id] = record
      mirror.instancesBySubdomain[record.subdomain] = record
      mirror.instancesByCanonicalId[canonicalId] = record
      mirror.instancesByCanonicalSubdomain[canonicalSubdomain] = record
      if (record.cname) {
        mirror.instancesByCname[record.cname] = record
      }
    }
    if (action === `delete`) {
      dbg(`instance`, { action, record })
      deleteInstance(record.id)
    }
  })

  client.collection(`users`).subscribe<UserFields>(`*`, (e) => {
    const deleteUser = (id: UserId) => {
      const oldUser = mirror.users[id]
      if (oldUser) {
        delete mirror.users[oldUser.id]
      }
    }
    const { action, record } = e
    if (action === `create` || action === `update`) {
      dbg(`user`, { action, record })
      deleteUser(record.id)
      mirror.users[record.id] = record
    }
    if (action === `delete`) {
      dbg(`user`, { action, record })
      deleteUser(record.id)
    }
  })

  const init = async () => {
    dbg(`init`)
    const instancesPromise = client
      .collection(`instances`)
      .getFullList<InstanceFields>()
      .then((instances) => {
        dbg(`instances: ${instances.length}`)
        forEach(instances, (instance) => {
          if (!mirror.instancesById[instance.id]) {
            mirror.instancesById[instance.id] = instance
          }
        })
      })
    const usersPromise = client
      .collection(`users`)
      .getFullList<UserFields>()
      .then((users) => {
        dbg(`users: ${users.length}`)
        forEach(users, (user) => {
          if (!mirror.users[user.id]) {
            mirror.users[user.id] = user
          }
        })
      })
    await Promise.all([instancesPromise, usersPromise])
  }
  await init().catch(error)

  const api = {
    async getInstance(id: InstanceId) {
      if (!mirror.instancesById[id]) {
        const record = await client.collection(`instances`).getOne<InstanceFields>(id)
        mirror.instancesById[id] = record
      }
      return mirror.instancesById[id]
    },
    async getInstanceByHost(host: string) {
      return (
        mirror.instancesByCname[host] ||
        mirror.instancesByCanonicalSubdomain[host] ||
        mirror.instancesByCanonicalId[host]
      )
    },

    async getUser(id: UserId) {
      if (!mirror.users[id]) {
        const record = await client.collection(`users`).getOne<UserFields>(id)
        mirror.users[id] = record
      }
      return mirror.users[id]
    },
  }
  return api
})
