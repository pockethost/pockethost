import {
  APP_URL,
  DAEMON_PB_IDLE_TTL,
  DOCS_URL,
  EDGE_APEX_DOMAIN,
  INSTANCE_APP_HOOK_DIR,
  INSTANCE_APP_MIGRATIONS_DIR,
  mkAppUrl,
  mkContainerHomePath,
  mkDocUrl,
  mkEdgeUrl,
  UPGRADE_MODE,
} from '$constants'
import {
  InstanceLogger,
  MothershipAdminClientService,
  PocketbaseService,
  PortService,
  proxyService,
  SpawnConfig,
} from '$services'
import {
  CLEANUP_PRIORITY_LAST,
  createCleanupManager,
  createTimerManager,
  InstanceFields,
  InstanceId,
  InstanceStatus,
  LoggerService,
  mkSingleton,
  SingletonBaseConfig,
} from '$shared'
import { asyncExitHook, mkInternalUrl, now } from '$util'
import { flatten, map, values } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { globSync } from 'glob'
import stringify from 'json-stringify-safe'
import { basename, join } from 'path'
import { ClientResponseError } from 'pocketbase'
import { AsyncReturnType } from 'type-fest'
import { mkInstanceCache } from './mkInstanceCache'

enum InstanceApiStatus {
  Starting = 'starting',
  Healthy = 'healthy',
  ShuttingDown = 'shutdown',
}

type InstanceApi = {
  status: () => InstanceApiStatus
  internalUrl: () => string
  startRequest: () => () => void
  shutdown: (reason?: Error) => Promise<void>
}

export type InstanceServiceConfig = SingletonBaseConfig & {
  instanceApiTimeoutMs: number
  instanceApiCheckIntervalMs: number
}

export type InstanceServiceApi = AsyncReturnType<typeof instanceService>
export const instanceService = mkSingleton(
  async (config: InstanceServiceConfig) => {
    const { instanceApiTimeoutMs, instanceApiCheckIntervalMs } = config
    const instanceServiceLogger = LoggerService().create('InstanceService')
    const { dbg, raw, error, warn } = instanceServiceLogger
    const { client } = await MothershipAdminClientService()

    const pbService = await PocketbaseService()

    const instanceApis: { [_: InstanceId]: InstanceApi } = {}

    const getInstanceApi = (instance: InstanceFields): Promise<InstanceApi> => {
      const _logger = instanceServiceLogger.create(`getInstanceApi`)
      const { id, subdomain, version } = instance
      _logger.breadcrumb(`${subdomain}:${id}:${version}`)
      const { dbg, trace } = _logger
      return new Promise<InstanceApi>((resolve, reject) => {
        let maxTries = instanceApiTimeoutMs / instanceApiCheckIntervalMs
        const retry = (interval = instanceApiCheckIntervalMs) => {
          maxTries--
          if (maxTries <= 0) {
            reject(
              new Error(
                `PocketBase instance failed to launch. Please check logs at ${APP_URL()}. [${id}:${subdomain}]. ${DOCS_URL(
                  `usage`,
                  `errors`,
                )}`,
              ),
            )
            return
          }
          dbg(`${maxTries} tries remaining. Retrying in ${interval}ms`)
          setTimeout(_check, interval)
        }
        const _check = () => {
          dbg(`Checking for existing instance API`)
          const instanceApi = instanceApis[id]
          if (!instanceApi) {
            dbg(`No API found, creating`)
            createInstanceApi(instance)
            retry(0)
            return
          }
          try {
            if (instanceApi.status() === InstanceApiStatus.Healthy) {
              dbg(`API found and healthy, returning`)
              resolve(instanceApi)
              return
            }
          } catch (e) {
            dbg(`Instance is in an error state, returning error`)
            reject(e)
            return
          }
          dbg(`API found but not healthy (${instanceApi.status()}), waiting`)
          retry()
        }
        _check()
      })
    }

    const createInstanceApi = (instance: InstanceFields): InstanceApi => {
      const { id, subdomain, version } = instance

      const systemInstanceLogger = instanceServiceLogger.create(
        `${subdomain}:${id}:${version}`,
      )
      const { dbg, warn, error, info, trace } = systemInstanceLogger

      if (instanceApis[id]) {
        throw new Error(
          `Attempted to create an instance API when one is already available for ${id}`,
        )
      }

      /*
      Initialize shutdown manager
      */
      const shutdownManager = createCleanupManager()
      shutdownManager.add(() => {
        dbg(`Shutting down: delete instanceApis[id]`)
        dbg(
          `Shutting down: There are ${
            values(instanceApis).length
          } still in API cache`,
        )
        delete instanceApis[id]
        dbg(
          `Shutting down: There are now ${
            values(instanceApis).length
          } still in API cache`,
        )
      }, CLEANUP_PRIORITY_LAST) // Make this the very last thing that happens
      shutdownManager.add(() => {
        dbg(`Shut down: InstanceApiStatus.ShuttingDown`)
        status = InstanceApiStatus.ShuttingDown
      })

      info(`Starting`)
      let status = InstanceApiStatus.Starting
      let internalUrl = ''
      let startRequest: InstanceApi['startRequest'] = () => {
        throw new Error(`Not ready yet`)
      }

      /*
      Initialize API
      */
      let _shutdownReason: Error | undefined
      const api: InstanceApi = {
        status: () => {
          if (_shutdownReason) throw _shutdownReason
          return status
        },
        internalUrl: () => {
          if (status !== InstanceApiStatus.Healthy) {
            throw new Error(
              `Attempt to access instance URL when instance is not in a healthy state.`,
            )
          }
          return internalUrl
        },
        startRequest: () => {
          if (status !== InstanceApiStatus.Healthy) {
            throw new Error(
              `Attempt to start an instance request when instance is not in a healthy state.`,
            )
          }
          return startRequest()
        },
        shutdown: async (reason) => {
          dbg(`Shutting down`)
          if (reason) {
            _shutdownReason = reason
            error(`Panic shutdown for ${reason}`)
          } else {
            dbg(`Graceful shutdown`)
          }
          if (status === InstanceApiStatus.ShuttingDown) {
            warn(`Already shutting down`)
            return
          }
          return shutdownManager.shutdown()
        },
      }
      const _safeShutdown = async (reason?: Error) => {
        if (status === InstanceApiStatus.ShuttingDown && reason) {
          warn(`Already shutting down, ${reason} will not be reported.`)
          return
        }
        return api.shutdown(reason)
      }
      instanceApis[id] = api

      const healthyGuard = () => {
        if (status !== InstanceApiStatus.ShuttingDown) return
        throw new Error(
          `HealthyGuard detected instance is shutting down. Aborting further initialization.`,
        )
      }

      /*
        Create serialized client communication functions to prevent race conditions
        */
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
              dbg(`Error updating instance fields`, fields)
              error(e)
            })
        },
      )
      const updateInstanceStatus = (id: InstanceId, status: InstanceStatus) =>
        updateInstance(id, { status })

      /*
      Handle async setup
      */
      ;(async () => {
        const { version } = instance

        /*
        Obtain empty port
        */
        dbg(`Obtaining port`)
        const [newPort, releasePort] = await PortService().alloc()
        shutdownManager.add(() => {
          dbg(`shut down: releasing port`)
          releasePort()
        }, CLEANUP_PRIORITY_LAST)
        systemInstanceLogger.breadcrumb(`port:${newPort}`)
        dbg(`Found port`)

        /*
        Create the user instance logger
        */
        healthyGuard()
        const userInstanceLogger = InstanceLogger(instance.id, `exec`)

        /*
        Start the instance
        */
        dbg(`Starting instance`)
        healthyGuard()
        updateInstanceStatus(instance.id, InstanceStatus.Starting)
        shutdownManager.add(async () => {
          dbg(`Shutting down: set instance status: idle`)
          updateInstanceStatus(id, InstanceStatus.Idle)
        })
        healthyGuard()

        /** Create spawn config */
        const spawnArgs: SpawnConfig = {
          subdomain: instance.subdomain,
          instanceId: instance.id,
          port: newPort,
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
                `${file}:${mkContainerHomePath(
                  `pb_hooks/${basename(file)}`,
                )}:ro`,
            ),
          ]),
          env: {
            ...instance.secrets,
            PH_APP_NAME: instance.subdomain,
            PH_INSTANCE_URL: mkEdgeUrl(instance.subdomain),
          },
          version,
        }

        /** Sync admin account */
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

        /*
        Spawn the child process
        */
        const childProcess = await (async () => {
          try {
            const cp = await pbService.spawn(spawnArgs)

            return cp
          } catch (e) {
            warn(`Error spawning: ${e}`)
            userInstanceLogger.error(`Error spawning: ${e}`)
            if (UPGRADE_MODE()) {
              // Noop
            } else {
              updateInstance(instance.id, {
                maintenance: true,
              })
            }
            throw new Error(
              `Could not launch container. Instance has been placed in maintenance mode. Please review your instance logs at https://app.pockethost.io/app/instances/${instance.id} or contact support at https://pockethost.io/support`,
            )
          }
        })()
        const { exitCode } = childProcess
        exitCode.then((code) => {
          info(`Processes exited with ${code}.`)
          if (code !== 0 && !UPGRADE_MODE()) {
            shutdownManager.add(async () => {
              userInstanceLogger.error(
                `Putting instance in maintenance mode because it shut down with return code ${code}. `,
              )
              error(
                `Putting instance in maintenance mode because it shut down with return code ${code}. `,
              )
              updateInstance(instance.id, {
                maintenance: true,
              })
            })
          }
          setImmediate(() => {
            _safeShutdown().catch(error)
          })
        })
        shutdownManager.add(async () => {
          dbg(`killing ${id}`)
          await childProcess.kill().catch(error)
          dbg(`killed ${id}`)
        })

        /*
        API state, timers, etc
        */
        const tm = createTimerManager({})
        shutdownManager.add(() => tm.shutdown())
        let openRequestCount = 0
        let lastRequest = now()
        internalUrl = mkInternalUrl(newPort)
        const RECHECK_TTL = 1000 // 1 second
        startRequest = () => {
          lastRequest = now()
          openRequestCount++
          const id = openRequestCount
          trace(`started new request`)
          return () => {
            openRequestCount--
            trace(`ended request (${openRequestCount} still open)`)
          }
        }
        {
          tm.repeat(async () => {
            trace(`idle check: ${openRequestCount} open requests`)
            if (
              openRequestCount === 0 &&
              lastRequest + DAEMON_PB_IDLE_TTL() < now()
            ) {
              info(`idle for ${DAEMON_PB_IDLE_TTL()}, shutting down`)
              healthyGuard()
              userInstanceLogger.info(
                `Instance has been idle for ${DAEMON_PB_IDLE_TTL()}ms. Hibernating to conserve resources.`,
              )
              await _safeShutdown().catch(error)
              return false
            } else {
              trace(`${openRequestCount} requests remain open`)
            }
            return true
          }, RECHECK_TTL)
        }

        dbg(`${internalUrl} is running`)
        status = InstanceApiStatus.Healthy
        healthyGuard()
        updateInstanceStatus(instance.id, InstanceStatus.Running)
      })().catch((e) => {
        const detail = (() => {
          if (e instanceof ClientResponseError) {
            const { response } = e
            if (response?.data) {
              const detail = map(
                response.data,
                (v, k) => `${k}:${v?.code}:${v?.message}`,
              ).join(`\n`)
              return detail
            }
          }
          return `${e}`
        })()
        warn(`Instance failed to start: ${detail}`)
        _safeShutdown(e).catch(error)
      })

      return api
    }

    const getInstance = (() => {
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
                  `Unexpected response ${JSON.stringify(e)} from mothership`,
                )
              }
            })
          if (instance) {
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
                  `Unexpected response ${JSON.stringify(e)} from mothership`,
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
                  `Unexpected response ${JSON.stringify(e)} from mothership`,
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

      const instance = await getInstance(host)
      if (!instance) {
        res.status(404).end(`${host} not found`)
        return
      }
      const owner = instance.expand.uid
      if (!owner) {
        throw new Error(`Instance owner is invalid`)
      }

      /*
        Maintenance check
        */
      dbg(`Checking for maintenance mode`)
      if (instance.maintenance) {
        throw new Error(
          `This instance is in Maintenance Mode. See ${mkDocUrl(
            `usage/maintenance`,
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

      const api = await getInstanceApi(instance)
      const endRequest = api.startRequest()
      res.on('close', endRequest)
      if (req.closed) {
        throw new Error(`Request already closed.`)
      }

      dbg(
        `Forwarding proxy request for ${
          req.url
        } to instance ${api.internalUrl()}`,
      )

      proxy.web(req, res, { target: api.internalUrl() })
    })

    asyncExitHook(async () => {
      dbg(`Shutting down instance manager`)
      const p = Promise.all(map(instanceApis, (api) => api.shutdown()))
      await p
    })

    return {}
  },
)
