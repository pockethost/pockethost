import {
  createEvent,
  EDGE_APEX_DOMAIN,
  ensureInstanceDirectoryStructure,
  InstanceFields,
  InstanceId,
  InstanceStatus,
  LoggerService,
  mkSingleton,
  PocketBase,
  SingletonBaseConfig,
  UserFields,
  UserId,
} from '@'

export type MirrorLiveInstance = {
  id: InstanceId
  status: InstanceStatus.Starting | InstanceStatus.Running
}

export type MirrorSyncOptions = {
  instances?: MirrorLiveInstance[]
  resetIdle?: boolean
}

export type MirrorDumpResponse = {
  users: UserFields[]
  instances: InstanceFields[]
}

export type MirrorSyncResponse = MirrorDumpResponse & {
  updated: number
}

export type MothershipMirrorServiceConfig = SingletonBaseConfig & {
  client: PocketBase
}

export const MothershipMirrorService = mkSingleton(async (config: MothershipMirrorServiceConfig) => {
  const logger = (config.logger ?? LoggerService()).create(`MothershipMirrorService`)
  const { dbg, error } = logger

  const [onInstanceUpserted, fireInstanceUpserted] = createEvent<InstanceFields>()
  const [onInstanceDeleted, fireInstanceDeleted] = createEvent<InstanceId>()
  const [onUserUpserted, fireUserUpserted] = createEvent<UserFields>()
  const [onUserDeleted, fireUserDeleted] = createEvent<UserId>()
  const [onResynced, fireResynced] = createEvent<undefined>()

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

  const upsertInstance = (record: InstanceFields) => {
    dbg(`upsertInstance ${record.id}`)
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
    ensureInstanceDirectoryStructure(record.id, logger)
  }

  const deleteInstance = (id: InstanceId) => {
    const oldInstance = mirror.instancesById[id]
    if (!oldInstance) return

    const canonicalId = `${oldInstance.id}.${EDGE_APEX_DOMAIN()}`
    const canonicalSubdomain = `${oldInstance.subdomain}.${EDGE_APEX_DOMAIN()}`

    delete mirror.instancesById[id]
    delete mirror.instancesBySubdomain[oldInstance.subdomain]
    delete mirror.instancesByCanonicalId[canonicalId]
    delete mirror.instancesByCanonicalSubdomain[canonicalSubdomain]
    if (oldInstance.cname) {
      delete mirror.instancesByCname[oldInstance.cname]
    }
  }

  const upsertUser = (record: UserFields) => {
    dbg(`upsertUser ${record.id}`)
    deleteUser(record.id)
    mirror.users[record.id] = record
  }

  const deleteUser = (id: UserId) => {
    const oldUser = mirror.users[id]
    if (oldUser) {
      delete mirror.users[oldUser.id]
    }
  }

  const applyMirrorDump = (users: UserFields[], instances: InstanceFields[]) => {
    users.forEach((user) => upsertUser(user))
    instances.forEach((instance) => upsertInstance(instance))
  }

  const syncMirror = async (options: MirrorSyncOptions = {}) => {
    const { instances = [], resetIdle = false } = options
    dbg(`syncMirror`, { live: instances.length, resetIdle })
    const {
      users,
      instances: mirrorInstances,
      updated,
    } = await client.send<MirrorSyncResponse>(`/api/mirror`, {
      method: `POST`,
      body: { instances, resetIdle },
    })
    applyMirrorDump(users, mirrorInstances)
    dbg(`synced mirror: ${mirrorInstances.length} instances, ${users.length} users, ${updated} live`)
  }

  let bootSyncDone = false
  let resolveReady!: () => void
  let rejectReady!: (reason: unknown) => void
  const whenReady = new Promise<void>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })

  const bootSync = async (options: MirrorSyncOptions = {}) => {
    if (bootSyncDone) {
      return syncMirror(options)
    }
    bootSyncDone = true
    try {
      await syncMirror(options)
      resolveReady()
    } catch (e) {
      bootSyncDone = false
      rejectReady(e)
      throw e
    }
  }

  let sseConnectedOnce = false
  client.realtime
    .subscribe(`PB_CONNECT`, () => {
      if (!sseConnectedOnce) {
        sseConnectedOnce = true
        return
      }
      dbg(`mothership SSE reconnected, syncing mirror with live instances`)
      fireResynced(undefined)
    })
    .catch(error)

  client
    .collection(`instances`)
    .subscribe<InstanceFields>(`*`, (e) => {
      const { action, record } = e
      if (action === `create` || action === `update`) {
        dbg(`instance`, { action, record })
        upsertInstance(record)
        fireInstanceUpserted(record)
      }
      if (action === `delete`) {
        dbg(`instance`, { action, record })
        deleteInstance(record.id)
        fireInstanceDeleted(record.id)
      }
    })
    .catch(error)

  client
    .collection(`users`)
    .subscribe<UserFields>(`*`, (e) => {
      const { action, record } = e
      if (action === `create` || action === `update`) {
        dbg(`user`, { action, record })
        upsertUser(record)
        fireUserUpserted(record)
      }
      if (action === `delete`) {
        dbg(`user`, { action, record })
        deleteUser(record.id)
        fireUserDeleted(record.id)
      }
    })
    .catch(error)

  const api = {
    async getInstance(id: InstanceId) {
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
      return mirror.users[id]
    },
    onInstanceUpserted,
    onInstanceDeleted,
    onUserDeleted,
    onUserUpserted,
    onResynced,
    bootSync,
    syncMirror,
    whenReady,
    getInstances: () => Object.values(mirror.instancesById),
    getUsers: () => Object.values(mirror.users),
  }
  return api
})
