import {
  APP_URL,
  asyncExitHook,
  DAEMON_PB_IDLE_TTL,
  DOC_URL,
  INSTANCE_APP_HOOK_DIR,
  INSTANCE_APP_MIGRATIONS_DIR,
  InstanceFields,
  InstanceId,
  InstanceLogWriter,
  InstanceStatus,
  isSystemError,
  isUserError,
  LoggerService,
  mkContainerHomePath,
  mkInstanceUrl,
  mkSingleton,
  MothershipAdminClientService,
  now,
  PocketbaseService,
  proxyService,
  SingletonBaseConfig,
  SpawnConfig,
  stringify,
  tryFetch,
  userError,
  VacuumLockService,
} from '@'
import Bottleneck from 'bottleneck'
import { globSync } from 'fs'
import { basename, join } from 'path'
import { AsyncReturnType } from 'type-fest'
import { MothershipMirrorService, type MirrorLiveInstance } from '../MothershipMirrorService'
import { instanceAppVersionFromPbVersion } from './instanceAppVersion'

enum InstanceApiStatus {
  Starting = 'starting',
  Healthy = 'healthy',
  ShuttingDown = 'shutdown',
}

type InstanceApi = {
  internalUrl: string
  startRequest: () => () => void
  shutdown: () => void
}

export type InstanceServiceConfig = SingletonBaseConfig & {
  instanceApiTimeoutMs: number
  instanceApiCheckIntervalMs: number
}

export type InstanceServiceApi = AsyncReturnType<typeof instanceService>
export const instanceService = mkSingleton(async (config: InstanceServiceConfig) => {
  const instanceServiceLogger = (config.logger ?? LoggerService()).create('InstanceService')
  const { dbg, raw, error, warn } = instanceServiceLogger
  const { client } = await MothershipAdminClientService()

  const pbService = await PocketbaseService()

  const mirror = await MothershipMirrorService()

  const instanceApis: { [_: InstanceId]: Promise<InstanceApi> } = {}

  const vacuumLocks = await VacuumLockService(config)
  vacuumLocks.registerIsLive((id) => Boolean(instanceApis[id]))

  const shutdownRunningInstance = async (id: InstanceId, reason: string) => {
    const pending = instanceApis[id]
    if (!pending) return
    dbg(`Shutting down ${id}: ${reason}`)
    const api = await pending
    api.shutdown()
  }

  const resolveLiveStatus = async (
    pending: Promise<InstanceApi>
  ): Promise<InstanceStatus.Running | InstanceStatus.Starting> => {
    try {
      await Promise.race([
        pending,
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`still starting`)), 0)
        }),
      ])
      return InstanceStatus.Running
    } catch {
      return InstanceStatus.Starting
    }
  }

  const getLiveInstances = async (): Promise<MirrorLiveInstance[]> => {
    return Promise.all(
      Object.entries(instanceApis).map(async ([id, pending]) => ({
        id,
        status: await resolveLiveStatus(pending),
      }))
    )
  }

  mirror.onResynced(() => {
    getLiveInstances()
      .then((instances) => mirror.syncMirror({ instances }))
      .catch((e) => {
        error(`Error syncing mirror after mothership reconnect`, { e })
      })
  })

  const createInstanceApi = async (instance: InstanceFields): Promise<InstanceApi> => {
    const shutdownManager: (() => void)[] = []

    const { id, subdomain, version } = instance
    const systemInstanceLogger = instanceServiceLogger.create(subdomain).breadcrumb(id).breadcrumb(version)
    const { dbg, warn, error, info, trace } = systemInstanceLogger
    const userInstanceLogger = InstanceLogWriter(instance.id, `exec`, systemInstanceLogger)

    shutdownManager.push(() => {
      dbg(`Shutting down`)
      userInstanceLogger.info(`Instance is shutting down.`)
    }) // Keep deletion separate and tied to actual process exit

    dbg(`Starting`)
    userInstanceLogger.info(`Instance is starting.`)

    let _shutdownReason: Error | undefined
    let internalUrl: string | undefined

    // Declare api variable early to avoid temporal dead zone
    let api: InstanceApi

    const clientLimiter = new Bottleneck({ maxConcurrent: 1 })
    const updateInstance = clientLimiter.wrap((id: InstanceId, fields: Partial<InstanceFields>) => {
      dbg(`Updating instance fields`, fields)
      return client
        .updateInstance(id, fields)
        .then(() => {
          dbg(`Updated instance fields`, fields)
        })
        .catch(() => {
          warn(
            `Could not update instance fields for ${id}; status will catch up if still running when mothership returns (mothership boot resets all instances to idle)`
          )
        })
    })
    const updateInstanceStatus = (id: InstanceId, status: InstanceStatus) => updateInstance(id, { status })

    let openRequestCount = 0
    let lastRequest = now()

    // Create shutdown function that can be referenced early
    let shutdownInProgress = false
    const shutdown = () => {
      if (shutdownInProgress) {
        dbg(`Shutdown already in progress`)
        return
      }
      shutdownInProgress = true
      dbg(`Shutting down`)
      for (let i = shutdownManager.length - 1; i >= 0; i--) {
        const fn = shutdownManager[i]
        if (typeof fn === 'function') fn()
      }
    }

    try {
      /** Mark the instance as starting */
      dbg(`Starting instance`)
      updateInstanceStatus(instance.id, InstanceStatus.Starting)
      shutdownManager.push(async () => {
        dbg(`Shutting down: set instance status: idle`)
        updateInstanceStatus(id, InstanceStatus.Idle)
      })

      /** Create spawn config */
      const instanceAppVersion = (() => {
        try {
          return instanceAppVersionFromPbVersion(instance.version)
        } catch {
          throw userError(`Invalid version: ${instance.version}`)
        }
      })()
      const spawnArgs: SpawnConfig = {
        subdomain: instance.subdomain,
        instanceId: instance.id,
        dev: instance.dev,
        extraBinds: [
          globSync(join(INSTANCE_APP_MIGRATIONS_DIR(instanceAppVersion), '*.js')).map(
            (file) => `${file}:${mkContainerHomePath(`pb_migrations/${basename(file)}`)}:ro`
          ),
          globSync(join(INSTANCE_APP_HOOK_DIR(instanceAppVersion), '*.js')).map(
            (file) => `${file}:${mkContainerHomePath(`pb_hooks/${basename(file)}`)}:ro`
          ),
        ].flat(),
        env: {
          ...instance.secrets,
          PH_APP_NAME: instance.subdomain,
          PH_INSTANCE_URL: mkInstanceUrl(instance),
        },
        version,
        logger: systemInstanceLogger,
      }

      /** Add admin sync info if enabled */
      if (instance.syncAdmin) {
        const id = instance.uid
        dbg(`Fetching token info for uid ${id}`)
        const { email, tokenKey, passwordHash } = await client.getUserTokenInfo({ id })
        dbg(`Token info is`, { email, tokenKey, passwordHash })
        spawnArgs.env!.ADMIN_SYNC = stringify({
          id,
          email,
          tokenKey,
          passwordHash,
        })
      }

      /** Spawn the child process */
      const childProcess = await pbService.spawn(spawnArgs)

      const { exitCode, stopped, started, url: internalUrl } = childProcess
      exitCode.then((code) => {
        dbg(`Instance exited with code ${code}`)
        dbg(`Shutting down: There are now ${Object.values(instanceApis).length} still in API cache`)
        shutdown()
        delete instanceApis[id]
      })

      shutdownManager.push(() => {
        if (stopped()) {
          dbg(`Instance already stopped`)
          return
        }
        dbg(`killing ${id}`)
        childProcess.kill().catch((err) => {
          error(`Error killing ${id}`, { err })
        })
        dbg(`killed ${id}`)
      })

      /** Health check */
      await tryFetch(`${internalUrl}/api/health`, {
        preflight: async () => {
          const current = await mirror.getInstance(id)
          if (current && !current.power) throw userError(`Instance powered off during startup`)
          if (stopped()) throw userError(`Container stopped ${id}`)
          return started()
        },
        logger: systemInstanceLogger,
      })

      /** Idle check */
      const idleTtl = instance.idleTtl || DAEMON_PB_IDLE_TTL()
      const idleTid = setInterval(() => {
        const lastRequestAge = now() - lastRequest
        dbg(`idle check: ${openRequestCount} open requests, ${lastRequestAge}ms since last request`)
        if (openRequestCount === 0 && lastRequestAge > idleTtl) {
          dbg(`idle for ${idleTtl}, shutting down`)
          userInstanceLogger.info(
            `Instance has been idle for ${DAEMON_PB_IDLE_TTL()}ms. Hibernating to conserve resources.`
          )
          shutdown()
          return false
        } else {
          dbg(`${openRequestCount} requests remain open`)
        }
        return true
      }, 1000)
      shutdownManager.push(() => clearInterval(idleTid))

      // Now assign the api object
      api = {
        internalUrl,
        startRequest: () => {
          lastRequest = now()
          openRequestCount++
          trace(`started new request`)
          return () => {
            openRequestCount--
            trace(`ended request (${openRequestCount} still open)`)
          }
        },
        shutdown,
      }

      dbg(`${internalUrl} is running`)
      updateInstanceStatus(instance.id, InstanceStatus.Running)

      return api
    } catch (e) {
      if (isUserError(e)) {
        dbg(`Spawn failed: ${e}`)
      } else {
        error(`Error spawning: ${e}`)
      }
      userInstanceLogger.error(`Error spawning: ${e}`)
      shutdownManager.forEach((fn) => fn())
      throw e
    }
  }

  mirror.onInstanceUpserted((instance) => {
    if (!instance.power) {
      shutdownRunningInstance(instance.id, 'power off').catch((e) => {
        error(`Error shutting down ${instance.id} on power off`, { e })
      })
    }
  })

  mirror.onInstanceDeleted((instanceId) => {
    shutdownRunningInstance(instanceId, 'instance deleted').catch((e) => {
      error(`Error shutting down ${instanceId} on delete`, { e })
    })
  })
  ;(await proxyService()).use(async (req, res, next) => {
    const logger = (config.logger ?? LoggerService()).create(`InstanceRequest`)

    const { dbg, warn, error } = logger

    if (req.path === `/logs` || req.path.startsWith(`/logs/`)) {
      next()
      return
    }

    const { host, proxy } = res.locals

    const instance = await mirror.getInstanceByHost(host)
    if (!instance) {
      res.status(404).end(`${host} not found`)
      return
    }
    logger.breadcrumb(`i:${instance.id}`)
    const owner = await mirror.getUser(instance.uid)
    if (!owner) {
      throw new Error(`Instance owner is invalid`)
    }
    logger.breadcrumb(`u:${owner.id}`)

    /*
        Suspension check
        */
    dbg(`Checking for suspension`)
    if (owner.suspension) {
      throw userError(owner.suspension)
    }
    if (instance.suspension) {
      throw userError(instance.suspension)
    }

    /*
        Active instance check
        */
    dbg(`Checking for active instances`)
    if (owner.subscription_quantity === 0) {
      throw userError(`Instances will not run until you <a href=${APP_URL(`access`)}>upgrade</a>`)
    }

    /*
        power check
        */
    dbg(`Checking for power`)
    if (!instance.power) {
      throw userError(`This instance is powered off. See ${DOC_URL(`power`)} for more information.`)
    }

    /*
        Owner check
        */
    dbg(`Checking for verified account`)
    if (!owner.verified) {
      throw userError(`Log in at ${APP_URL()} to verify your account.`)
    }

    if (vacuumLocks.isLocked(instance.id)) {
      throw userError(
        `This instance is temporarily unavailable due to database maintenance. Please try again in a few minutes.`
      )
    }

    const start = now()
    if (!instanceApis[instance.id]) {
      instanceApis[instance.id] = createInstanceApi(instance).catch((e) => {
        const end = now()
        const duration = end - start
        if (isUserError(e)) {
          dbg(`Container ${instance.id} failed to launch in ${duration}ms`)
        } else {
          warn(`Container ${instance.id} failed to launch in ${duration}ms`)
        }

        delete instanceApis[instance.id]

        if (isSystemError(e)) {
          throw e
        }

        throw userError(
          `Could not launch container. Please review your instance logs at https://app.pockethost.io/app/instances/${instance.id} or contact support at https://pockethost.io/support. [${res.locals.requestId}]`
        )
      })
    }
    const api = await instanceApis[instance.id]!

    const endRequest = api.startRequest()
    res.on('close', endRequest)
    if (req.closed) {
      dbg(`Request already closed. ${res.locals.requestId}`)
    }

    dbg(`Forwarding proxy request for ${req.url} to instance ${api.internalUrl}`)

    proxy.web(req, res, { target: api.internalUrl })
  })

  asyncExitHook(async () => {
    dbg(`Shutting down instance manager`)
    const p = Promise.all(Object.values(instanceApis).map(async (api) => (await api).shutdown()))
    await p
  })

  return {}
})
