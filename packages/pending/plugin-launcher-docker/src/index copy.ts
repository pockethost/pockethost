import { flatten, map, values } from '@s-libs/micro-dash'
import { globSync } from 'glob'
import { basename, join } from 'path'
import {
  CLEANUP_PRIORITY_LAST,
  ClientResponseError,
  DAEMON_PB_IDLE_TTL,
  INSTANCE_APP_HOOK_DIR,
  INSTANCE_APP_MIGRATIONS_DIR,
  InstanceFields,
  InstanceId,
  LoggerService,
  PocketHostAction,
  PocketHostFilter,
  SingletonBaseConfig,
  action,
  asyncExitHook,
  createCleanupManager,
  createTimerManager,
  filter,
  mkContainerHomePath,
  mkEdgeUrl,
  mkInternalUrl,
  mkSingleton,
  now,
  registerAction,
  registerFilter,
} from 'pockethost/core'
import { PortService } from 'pockethost/src/services'
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
            filter(
              PocketHostFilter.Core_FailedToLaunchInstanceMessage,
              `PocketBase instance failed to launch.`,
              { instance },
            ).then((msg) => reject(new Error(msg)))
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
      Handle async setup
      */
      ;(async () => {
        /*
        Obtain empty port
        */
        dbg(`Obtaining port`)
        const [newPortPromise, releasePort] = PortService().alloc()
        const newPort = await newPortPromise
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

        /*
        Start the instance
        */
        dbg(`Starting instance`)
        healthyGuard()
        action(PocketHostAction.Core_BeforeInstanceStarted, { instance })
        shutdownManager.add(async () => {
          dbg(`Shutting down: set instance status: idle`)
          action(PocketHostAction.Core_BeforeInstanceStopped, { instance })
        })
        healthyGuard()

        /** Create spawn config */
        const spawnArgs = await filter<SpawnConfig>(
          PocketHostFilter.Core_SpawnConfig,
          {
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
          },
          { instance },
        )

        registerAction(
          PocketHostAction.Core_AfterInstanceStarted,
          async ({ instance }) => {},
        )
        registerAction(
          PocketHostAction.Core_AfterInstanceStopped,
          async ({ instance }) => {},
        )
        await action(PocketHostAction.Core_StartInstance, { instance })

        /*
        Spawn the child process
        */
        const childProcess = await (async () => {
          try {
            const url = await filter(PocketHostFilter.Core_LaunchInstance, '', {
              instance,
            })
            const cp = await pbService.spawn(spawnArgs)

            return cp
          } catch (e) {
            warn(`Error spawning: ${e}`)
            userInstanceLogger.error(`Error spawning: ${e}`)
            throw new Error(
              await filter(
                PocketHostFilter.Core_ErrorSpawningInstanceMessage,
                `Could not launch instance.`,
                { instance },
              ),
            )
          }
        })()
        const { exitCode } = childProcess
        exitCode.then((code) => {
          info(`Processes exited with ${code}.`)
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
        action(PocketHostAction.Core_AfterInstanceStarted, { instance })
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

    registerFilter(
      PocketHostFilter.Core_GetOrProvisionInstanceUrl,
      async ({ req, res, instance }) => {
        const logger = LoggerService().create(`InstanceRequest`)

        const { dbg } = logger

        const api = await getInstanceApi(instance)
        const endRequest = api.startRequest()
        res.on('close', endRequest)
        if (req.closed) {
          throw new Error(`Request already closed.`)
        }

        return api.internalUrl()
      },
    )

    asyncExitHook(async () => {
      dbg(`Shutting down instance manager`)
      const p = Promise.all(map(instanceApis, (api) => api.shutdown()))
      await p
    })

    return {}
  },
)
