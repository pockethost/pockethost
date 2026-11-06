import {
  createEvent,
  EDGE_APEX_DOMAIN,
  ensureInstanceDirectoryStructure,
  InstanceFields,
  InstanceId,
  InstanceStatus,
  LoggerService,
  mkSingleton,
  PH_MIRROR_DRIFT_CHECK_MS,
  PocketBase,
  SingletonBaseConfig,
  UserFields,
  UserId,
} from '@'
import { findMirrorDrift, toPbDate, type MirrorDrift } from './drift'

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
  const { dbg, info, warn, error } = logger

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

  /** Events the realtime subscription should have delivered but didn't are only reported once the change is this old. */
  const DRIFT_GRACE_MS = 10 * 1000
  let initialSyncDone = false

  const reportDrift = (collection: string, source: string, drifts: MirrorDrift<{ id: string; updated: string }>[]) => {
    for (const { record, kind, changedKeys } of drifts) {
      warn(`Mirror drift (${source}): ${kind} ${collection} ${record.id} [${changedKeys.join(', ')}]`)
    }
  }

  /** Store records the mirror missed and fire the events realtime would have fired. */
  const applyDrift = (
    source: string,
    instanceDrift: MirrorDrift<InstanceFields>[],
    userDrift: MirrorDrift<UserFields>[]
  ) => {
    reportDrift(`user`, source, userDrift)
    reportDrift(`instance`, source, instanceDrift)
    for (const { record } of userDrift) {
      upsertUser(record)
      fireUserUpserted(record)
    }
    for (const { record } of instanceDrift) {
      upsertInstance(record)
      fireInstanceUpserted(record)
    }
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
    if (initialSyncDone) {
      // A resync after a reconnect must act on changes missed while disconnected, not just store them.
      const cutoff = toPbDate(Date.now() - DRIFT_GRACE_MS)
      applyDrift(
        `resync`,
        findMirrorDrift((id) => mirror.instancesById[id], mirrorInstances, cutoff),
        findMirrorDrift((id) => mirror.users[id], users, cutoff)
      )
    }
    applyMirrorDump(users, mirrorInstances)
    initialSyncDone = true
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

  /**
   * Safety net for missed realtime events: periodically fetch recently updated records and apply any the mirror doesn't
   * have. Each one found is logged as drift so missed events can be measured.
   */
  const driftCheckMs = PH_MIRROR_DRIFT_CHECK_MS()
  if (driftCheckMs > 0) {
    let since = Date.now()
    let checking = false
    const checkDrift = async () => {
      if (!initialSyncDone || checking) return
      checking = true
      const start = Date.now()
      try {
        const filter = client.filter(`updated >= {:from}`, { from: toPbDate(since - DRIFT_GRACE_MS) })
        const [instances, users] = await Promise.all([
          client.collection(`instances`).getFullList<InstanceFields>({ filter, batch: 500 }),
          client.collection(`users`).getFullList<UserFields>({ filter, batch: 500 }),
        ])
        const cutoff = toPbDate(start - DRIFT_GRACE_MS)
        const instanceDrift = findMirrorDrift((id) => mirror.instancesById[id], instances, cutoff)
        const userDrift = findMirrorDrift((id) => mirror.users[id], users, cutoff)
        applyDrift(`poll`, instanceDrift, userDrift)
        dbg(
          `drift check: ${instances.length} instances, ${users.length} users, ${instanceDrift.length + userDrift.length} drifted`
        )
        // Records newer than the cutoff were not judged yet; overlap the next window so they are.
        since = start - DRIFT_GRACE_MS
      } catch (e) {
        error(`Mirror drift check failed; will retry`, { e })
      } finally {
        checking = false
      }
    }
    setInterval(() => void checkDrift(), driftCheckMs).unref()
    info(`Mirror drift check every ${driftCheckMs}ms`)
  }

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
