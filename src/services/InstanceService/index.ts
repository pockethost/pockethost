import {
  DAEMON_PB_IDLE_TTL,
  EDGE_APEX_DOMAIN,
  INSTANCE_APP_HOOK_DIR,
  INSTANCE_APP_MIGRATIONS_DIR,
  INSTANCE_DATA_DB,
  mkAppUrl,
  mkContainerHomePath,
  mkDocUrl,
  mkEdgeUrl,
  UPGRADE_MODE,
} from '$constants'
import {
  InstanceLogger,
  MothershipAdmimClientService,
  PocketbaseService,
  PortService,
  proxyService,
  SqliteService,
} from '$services'
import {
  assertTruthy,
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
import { basename, join } from 'path'
import { ClientResponseError } from 'pocketbase'
import { AsyncReturnType } from 'type-fest'

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
    const { client } = await MothershipAdmimClientService()

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
            reject(new Error(`Timeout obtaining instance API.`))
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
          dbg(`API found but not healthy, waiting`)
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
      const { dbg, warn, error, info } = systemInstanceLogger

      if (instanceApis[id]) {
        throw new Error(
          `Attempted to create an instance API when one is already available for ${id}`,
        )
      }

      /*
      Initialize shutdown manager
      */
      const shutdownManager = createCleanupManager()
      shutdownManager.add(async () => {
        dbg(`Deleting from cache`)
        delete instanceApis[id]
        dbg(`There are ${values(instanceApis).length} still in cache`)
      }, CLEANUP_PRIORITY_LAST) // Make this the very last thing that happens
      shutdownManager.add(async () => {
        dbg(`Shutting down`)
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
        if (status === InstanceApiStatus.ShuttingDown) {
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
      const updateInstanceStatus = clientLimiter.wrap(
        client.updateInstanceStatus,
      )
      const updateInstance = clientLimiter.wrap(client.updateInstance)

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
          dbg(`Releasing port`)
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
        dbg(`Set instance status: starting`)
        healthyGuard()
        await updateInstanceStatus(instance.id, InstanceStatus.Starting)
        shutdownManager.add(async () => {
          dbg(`Set instance status: idle`)
          await updateInstanceStatus(id, InstanceStatus.Idle).catch(error)
        })
        healthyGuard()

        /**
         * Sync admin account
         */
        if (instance.syncAdmin) {
          const id = instance.uid
          dbg(`Fetching token info for uid ${id}`)
          const { email, tokenKey, passwordHash } =
            await client.getUserTokenInfo({ id })
          dbg(`Token info is`, { email, tokenKey, passwordHash })
          const sqliteService = await SqliteService()
          const db = await sqliteService.getDatabase(
            INSTANCE_DATA_DB(instance.id),
          )
          userInstanceLogger.info(`Syncing admin login`)
          await db(`_admins`)
            .insert({ id, email, tokenKey, passwordHash })
            .onConflict('id')
            .merge({ email, tokenKey, passwordHash })
            .catch((e) => {
              userInstanceLogger.error(`Failed to sync admin account: ${e}`)
            })
        }

        /*
        Spawn the child process
        */
        const childProcess = await (async () => {
          try {
            const cp = await pbService.spawn({
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
            })

            return cp
          } catch (e) {
            warn(`Error spawning: ${e}`)
            if (UPGRADE_MODE()) {
              throw new Error(
                `PocketHost is rebooting. Try again in a few seconds.`,
              )
            } else {
              await updateInstance(instance.id, {
                maintenance: true,
              })
              userInstanceLogger.error(
                `Could not launch container. Instance has been placed in maintenace mode. Please review your instance logs at https://app.pockethost.io/app/instances/${instance.id} or contact support at https://pockethost.io/support`,
              )
              throw new Error(`Maintenance mode`)
            }
          }
        })()
        const { pid: _pid, exitCode } = childProcess
        const pid = _pid()
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
              await updateInstance(instance.id, {
                maintenance: true,
              })
            })
          }
          setImmediate(() => {
            _safeShutdown().catch(error)
          })
        })
        assertTruthy(pid, `Expected PID here but got ${pid}`)
        dbg(`Instance PID: ${pid}`)

        systemInstanceLogger.breadcrumb(`pid:${pid}`)
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
          dbg(`started new request`)
          return () => {
            openRequestCount--
            dbg(`ended request (${openRequestCount} still open)`)
          }
        }
        {
          tm.repeat(async () => {
            dbg(`idle check: ${openRequestCount} open requests`)
            if (
              openRequestCount === 0 &&
              lastRequest + DAEMON_PB_IDLE_TTL() < now()
            ) {
              info(`idle for ${DAEMON_PB_IDLE_TTL()}, shutting down`)
              healthyGuard()
              await _safeShutdown().catch(error)
              return false
            } else {
              dbg(`${openRequestCount} requests remain open`)
            }
            return true
          }, RECHECK_TTL)
        }

        dbg(`${internalUrl} is running`)
        status = InstanceApiStatus.Healthy
        healthyGuard()
        await updateInstanceStatus(instance.id, InstanceStatus.Running)
      })().catch((e) => {
        warn(
          `Instance failed to start with ${e}`,
          (e as ClientResponseError).originalError?.message,
        )
        _safeShutdown(e).catch(error)
      })

      return api
    }

    const getInstance = async (host: string) => {
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
          if (!instance.cname_active) {
            throw new Error(
              `CNAME not active for this instance. See dashboard.`,
            )
          }
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
          return instance
        }
      }
      dbg(`${idOrSubdomain} is neither an cname nor a subdomain`)
    }

    ;(await proxyService()).use(async (req, res, next) => {
      const logger = LoggerService().create(`InstanceRequest`)

      const { dbg } = logger

      const { host, proxy } = res.locals

      const instance = await getInstance(host)
      if (!instance) {
        res.writeHead(404, {
          'Content-Type': `text/plain`,
        })
        res.end(`${host} not found`)
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

    const getInstanceApiIfExistsById = (id: InstanceId) => instanceApis[id]

    return { getInstanceApiIfExistsById }
  },
)
