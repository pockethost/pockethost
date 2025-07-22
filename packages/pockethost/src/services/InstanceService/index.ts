import {
  APP_URL,
  DAEMON_PB_IDLE_TTL,
  DOC_URL,
  INSTANCE_APP_HOOK_DIR,
  INSTANCE_APP_MIGRATIONS_DIR,
  InstanceFields,
  InstanceId,
  InstanceLogWriter,
  InstanceStatus,
  LoggerService,
  MothershipAdminClientService,
  PocketbaseService,
  SingletonBaseConfig,
  SpawnConfig,
  asyncExitHook,
  mkContainerHomePath,
  mkInstanceUrl,
  mkSingleton,
  now,
  proxyService,
  stringify,
  tryFetch,
} from '@'
import { flatten, map, values } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { globSync } from 'glob'
import { basename, join } from 'path'
import { AsyncReturnType } from 'type-fest'
import { MothershipMirrorService } from '../MothershipMirrorService'

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

  const instanceApis: { [_: InstanceId]: Promise<InstanceApi> } = {}

  const createInstanceApi = async (instance: InstanceFields): Promise<InstanceApi> => {
    const shutdownManager: (() => void)[] = []

    const { id, subdomain, version } = instance
    const systemInstanceLogger = instanceServiceLogger.create(subdomain).breadcrumb(id).breadcrumb(version)
    const { dbg, warn, error, info, trace } = systemInstanceLogger
    const userInstanceLogger = InstanceLogWriter(instance.id, instance.volume, `exec`, systemInstanceLogger)

    shutdownManager.push(() => {
      dbg(`Shutting down`)
      userInstanceLogger.info(`Instance is shutting down.`)
      delete instanceApis[id]
      dbg(`Shutting down: There are now ${values(instanceApis).length} still in API cache`)
    }) // Make this the very last thing that happens

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
        .catch((e) => {
          error(`Error updating instance fields for ${id}`, { fields, e })
        })
    })
    const updateInstanceStatus = (id: InstanceId, status: InstanceStatus) => updateInstance(id, { status })

    let openRequestCount = 0
    let lastRequest = now()

    // Create shutdown function that can be referenced early
    const shutdown = () => {
      dbg(`Shutting down`)
      shutdownManager.forEach((fn) => fn())
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
        const [major, minor] = instance.version.split('.').map(Number)
        if (!minor) {
          throw new Error(`Invalid version: ${instance.version}`)
        }
        if (minor <= 22) return `v22`
        return `v23`
      })()
      const spawnArgs: SpawnConfig = {
        subdomain: instance.subdomain,
        instanceId: instance.id,
        volume: instance.volume,
        dev: instance.dev,
        extraBinds: flatten([
          globSync(join(INSTANCE_APP_MIGRATIONS_DIR(instanceAppVersion), '*.js')).map(
            (file) => `${file}:${mkContainerHomePath(`pb_migrations/${basename(file)}`)}:ro`
          ),
          globSync(join(INSTANCE_APP_HOOK_DIR(instanceAppVersion), '*.js')).map(
            (file) => `${file}:${mkContainerHomePath(`pb_hooks/${basename(file)}`)}:ro`
          ),
        ]),
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
        shutdown()
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
          if (stopped()) throw new Error(`Container stopped ${id}`)
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
      error(`Error spawning: ${e}`)
      userInstanceLogger.error(`Error spawning: ${e}`)
      shutdownManager.forEach((fn) => fn())
      throw e
    }
  }

  const mirror = await MothershipMirrorService()

  ;(await proxyService()).use(async (req, res, next) => {
    const logger = (config.logger ?? LoggerService()).create(`InstanceRequest`)

    const { dbg, warn, error } = logger

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
      throw new Error(owner.suspension)
    }
    if (instance.suspension) {
      throw new Error(instance.suspension)
    }

    /*
        Active instance check
        */
    dbg(`Checking for active instances`)
    if (owner.subscription_quantity === 0) {
      throw new Error(`Instances will not run until you <a href=${APP_URL(`access`)}>upgrade</a>`)
    }

    /*
        power check
        */
    dbg(`Checking for power`)
    if (!instance.power) {
      throw new Error(`This instance is powered off. See ${DOC_URL(`power`)} for more information.`)
    }

    /*
        Owner check
        */
    dbg(`Checking for verified account`)
    if (!owner.verified) {
      throw new Error(`Log in at ${APP_URL()} to verify your account.`)
    }

    const start = now()
    const api = await (instanceApis[instance.id] = instanceApis[instance.id] || createInstanceApi(instance)).catch(
      (e) => {
        const end = now()
        const duration = end - start
        warn(`Container ${instance.id} failed to launch in ${duration}ms`)

        throw new Error(
          `Could not launch container. Please review your instance logs at https://app.pockethost.io/app/instances/${instance.id} or contact support at https://pockethost.io/support. [${res.locals.requestId}]`
        )
      }
    )
    const end = now()
    const duration = end - start
    if (duration > 200) {
      warn(`Container ${instance.id} launch took ${duration}ms`)
    }

    const endRequest = api.startRequest()
    res.on('close', endRequest)
    if (req.closed) {
      error(`Request already closed. ${res.locals.requestId}`)
    }

    dbg(`Forwarding proxy request for ${req.url} to instance ${api.internalUrl}`)

    proxy.web(req, res, { target: api.internalUrl })
  })

  asyncExitHook(async () => {
    dbg(`Shutting down instance manager`)
    const p = Promise.all(map(instanceApis, async (api) => (await api).shutdown()))
    await p
  })

  return {}
})
