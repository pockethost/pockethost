import { flatten, map, values } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { globSync } from 'glob'
import { basename, join } from 'path'
import { AsyncReturnType } from 'type-fest'
import {
  ClientResponseError,
  DAEMON_PB_IDLE_TTL,
  EDGE_APEX_DOMAIN,
  INSTANCE_APP_HOOK_DIR,
  INSTANCE_APP_MIGRATIONS_DIR,
  InstanceFields,
  InstanceId,
  InstanceStatus,
  LoggerService,
  SingletonBaseConfig,
  asyncExitHook,
  mkAppUrl,
  mkContainerHomePath,
  mkDocUrl,
  mkInstanceUrl,
  mkSingleton,
  now,
  stringify,
  tryFetch,
} from '../../../core'
import {
  InstanceLogger,
  MothershipAdminClientService,
  PocketbaseService,
  SpawnConfig,
  proxyService,
} from '../../services'
import { mkInstanceCache } from './mkInstanceCache'

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
export const instanceService = mkSingleton(
  async (config: InstanceServiceConfig) => {
    const instanceServiceLogger = LoggerService().create('InstanceService')
    const { dbg, raw, error, warn } = instanceServiceLogger
    const { client } = await MothershipAdminClientService()

    const pbService = await PocketbaseService()

    const instanceApis: { [_: InstanceId]: Promise<InstanceApi> } = {}

    const createInstanceApi = async (
      instance: InstanceFields,
    ): Promise<InstanceApi> => {
      const shutdownManager: (() => void)[] = []

      const { id, subdomain, version } = instance
      const systemInstanceLogger = instanceServiceLogger.create(
        `${subdomain}:${id}:${version}`,
      )
      const { dbg, warn, error, info, trace } = systemInstanceLogger
      const userInstanceLogger = InstanceLogger(instance.id, `exec`)

      shutdownManager.push(() => {
        dbg(`Shutting down`)
        userInstanceLogger.info(`Instance is shutting down.`)
        delete instanceApis[id]
        dbg(
          `Shutting down: There are now ${
            values(instanceApis).length
          } still in API cache`,
        )
      }) // Make this the very last thing that happens

      info(`Starting`)
      userInstanceLogger.info(`Instance is starting.`)

      let _shutdownReason: Error | undefined
      let internalUrl: string | undefined

      const clientLimiter = new Bottleneck({ maxConcurrent: 1 })
      const updateInstance = clientLimiter.wrap(
        (id: InstanceId, fields: Partial<InstanceFields>) => {
          dbg(`Updating instance fields`, fields)
          return client
            .updateInstance(id, fields)
            .then(() => {
              dbg(`Updated instance fields`, fields)
            })
            .catch((e) => {
              error(`Error updating instance fields`, { fields, e })
            })
        },
      )
      const updateInstanceStatus = (id: InstanceId, status: InstanceStatus) =>
        updateInstance(id, { status })

      let openRequestCount = 0
      let lastRequest = now()

      try {
        /** Mark the instance as starting */
        dbg(`Starting instance`)
        updateInstanceStatus(instance.id, InstanceStatus.Starting)
        shutdownManager.push(async () => {
          dbg(`Shutting down: set instance status: idle`)
          updateInstanceStatus(id, InstanceStatus.Idle)
        })

        /** Create spawn config */
        const spawnArgs: SpawnConfig = {
          subdomain: instance.subdomain,
          instanceId: instance.id,
          dev: instance.dev,
          extraBinds: flatten([
            globSync(join(INSTANCE_APP_MIGRATIONS_DIR(), '*.js')).map(
              (file) =>
                `${file}:${mkContainerHomePath(
                  `pb_migrations/${basename(file)}`,
                )}:ro`,
            ),
            globSync(join(INSTANCE_APP_HOOK_DIR(), '*.js')).map(
              (file) =>
                `${file}:${mkContainerHomePath(`pb_hooks/${basename(file)}`)}:ro`,
            ),
          ]),
          env: {
            ...instance.secrets,
            PH_APP_NAME: instance.subdomain,
            PH_INSTANCE_URL: mkInstanceUrl(instance),
          },
          version,
        }

        /** Add admin sync info if enabled */
        if (instance.syncAdmin) {
          const id = instance.uid
          dbg(`Fetching token info for uid ${id}`)
          const { email, tokenKey, passwordHash } =
            await client.getUserTokenInfo({ id })
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

        shutdownManager.push(() => {
          dbg(`killing ${id}`)
          childProcess.kill().catch((err) => {
            error(`Error killing ${id}`, { err })
          })
          dbg(`killed ${id}`)
        })

        /** Health check */
        await tryFetch(`${internalUrl}/api/health`, {
          preflight: async () => {
            if (stopped()) throw new Error(`Container stopped`)
            return started()
          },
        })

        /** Idle check */
        const idleTid = setInterval(() => {
          const lastRequestAge = now() - lastRequest
          dbg(
            `idle check: ${openRequestCount} open requests, ${lastRequestAge}ms since last request`,
          )
          if (openRequestCount === 0 && lastRequestAge > DAEMON_PB_IDLE_TTL()) {
            info(`idle for ${DAEMON_PB_IDLE_TTL()}, shutting down`)
            userInstanceLogger.info(
              `Instance has been idle for ${DAEMON_PB_IDLE_TTL()}ms. Hibernating to conserve resources.`,
            )
            shutdownManager.forEach((fn) => fn())
            return false
          } else {
            dbg(`${openRequestCount} requests remain open`)
          }
          return true
        }, 1000)
        shutdownManager.push(() => clearInterval(idleTid))

        const api: InstanceApi = {
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
          shutdown: () => {
            dbg(`Shutting down`)
            shutdownManager.forEach((fn) => fn())
          },
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

    const getInstanceRecord = (() => {
      const cache = mkInstanceCache(client.client)

      return async (host: string) => {
        if (cache.hasItem(host)) {
          dbg(`cache hit ${host}`)
          return cache.getItem(host)
        }
        dbg(`cache miss ${host}`)

        {
          dbg(`Trying to get instance by host: ${host}`)
          const instance = await client
            .getInstanceByCname(host)

            .catch((e: ClientResponseError) => {
              if (e.status !== 404) {
                throw new Error(
                  `Unexpected response ${stringify(e)} from mothership`,
                )
              }
            })
          if (instance) {
            if (!instance.cname_active) {
              throw new Error(`CNAME blocked.`)
            }
            dbg(`${host} is a cname`)
            cache.setItem(instance)
            return instance
          }
        }

        const idOrSubdomain = host.replace(`.${EDGE_APEX_DOMAIN()}`, '')
        {
          dbg(`Trying to get instance by ID: ${idOrSubdomain}`)
          const instance = await client
            .getInstanceById(idOrSubdomain)
            .catch((e: ClientResponseError) => {
              if (e.status !== 404) {
                throw new Error(
                  `Unexpected response ${stringify(e)} from mothership`,
                )
              }
            })
          if (instance) {
            dbg(`${idOrSubdomain} is an instance ID`)
            cache.setItem(instance)
            return instance
          }
        }
        {
          dbg(`Trying to get instance by subdomain: ${idOrSubdomain}`)
          const instance = await client
            .getInstanceBySubdomain(idOrSubdomain)
            .catch((e: ClientResponseError) => {
              if (e.status !== 404) {
                throw new Error(
                  `Unexpected response ${stringify(e)} from mothership`,
                )
              }
            })
          if (instance) {
            dbg(`${idOrSubdomain} is a subdomain`)
            cache.setItem(instance)
            return instance
          }
        }
        dbg(`${host} is none of: cname, id, subdomain`)
        cache.blankItem(host)
      }
    })()

    ;(await proxyService()).use(async (req, res, next) => {
      const logger = LoggerService().create(`InstanceRequest`)

      const { dbg } = logger

      const { host, proxy } = res.locals

      const instance = await getInstanceRecord(host)
      if (!instance) {
        res.status(404).end(`${host} not found`)
        return
      }
      const owner = instance.expand.uid
      if (!owner) {
        throw new Error(`Instance owner is invalid`)
      }

      /*
        Suspension check
        */
      dbg(`Checking for suspension`)
      if (instance.suspension) {
        throw new Error(instance.suspension)
      }

      /*
        Maintenance check
        */
      dbg(`Checking for maintenance mode`)
      if (instance.maintenance) {
        throw new Error(
          `This instance is powered off. See ${mkDocUrl(
            `power`,
          )} for more information.`,
        )
      }

      /*
        Owner check
        */
      dbg(`Checking for verified account`)
      if (!owner.verified) {
        throw new Error(`Log in at ${mkAppUrl()} to verify your account.`)
      }

      const api = await (instanceApis[instance.id] =
        instanceApis[instance.id] || createInstanceApi(instance)).catch((e) => {
        throw new Error(
          `Could not launch container. Please review your instance logs at https://app.pockethost.io/app/instances/${instance.id} or contact support at https://pockethost.io/support. [${res.locals.requestId}]`,
        )
      })

      const endRequest = api.startRequest()
      res.on('close', endRequest)
      if (req.closed) {
        error(`Request already closed. ${res.locals.requestId}`)
      }

      dbg(
        `Forwarding proxy request for ${
          req.url
        } to instance ${api.internalUrl}`,
      )

      proxy.web(req, res, { target: api.internalUrl })
    })

    asyncExitHook(async () => {
      dbg(`Shutting down instance manager`)
      const p = Promise.all(
        map(instanceApis, async (api) => (await api).shutdown()),
      )
      await p
    })

    return {}
  },
)
