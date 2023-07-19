import {
  DAEMON_PB_DATA_DIR,
  DAEMON_PB_IDLE_TTL,
  PUBLIC_APP_DB,
  PUBLIC_APP_DOMAIN,
  PUBLIC_APP_PROTOCOL,
} from '$constants'
import { clientService, proxyService } from '$services'
import { mkInternalUrl, now } from '$util'
import {
  assertTruthy,
  CLEANUP_PRIORITY_LAST,
  createCleanupManager,
  createTimerManager,
  InstanceFields,
  InstanceId,
  InstanceStatus,
  mkSingleton,
  safeCatch,
  serialAsyncExecutionGuard,
  SingletonBaseConfig,
  StreamNames,
} from '@pockethost/common'
import { map, values } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { existsSync } from 'fs'
import { join } from 'path'
import { ClientResponseError } from 'pocketbase'
import { AsyncReturnType } from 'type-fest'
import { instanceLoggerService } from '../InstanceLoggerService'
import { pocketbaseService } from '../PocketBaseService'
import { createDenoProcess } from './Deno/DenoProcess'
import { portManager, PortManagerConfig } from './PortManager'

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
} & PortManagerConfig

export type InstanceServiceApi = AsyncReturnType<typeof instanceService>
export const instanceService = mkSingleton(
  async (config: InstanceServiceConfig) => {
    const {
      logger,
      instanceApiTimeoutMs,
      instanceApiCheckIntervalMs,
      maxPorts,
    } = config
    const instanceServiceLogger = logger.create('InstanceService')
    const { dbg, raw, error, warn } = instanceServiceLogger
    const { client } = await clientService()

    const pbService = await pocketbaseService()

    const instanceApis: { [_: InstanceId]: InstanceApi } = {}

    client.resetInstances().catch(error)

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
        `${subdomain}:${id}:${version}`
      )
      const { dbg, warn, error, info } = systemInstanceLogger

      if (instanceApis[id]) {
        throw new Error(
          `Attempted to create an instance API when one is already available for ${id}`
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
              `Attempt to access instance URL when instance is not in a healthy state.`
            )
          }
          return internalUrl
        },
        startRequest: () => {
          if (status !== InstanceApiStatus.Healthy) {
            throw new Error(
              `Attempt to start an instance request when instance is not in a healthy state.`
            )
          }
          return startRequest()
        },
        shutdown: async (reason) => {
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
          `HealthyGuard detected instance is shutting down. Aborting further initialization.`
        )
      }

      /*
        Create serialized client communication functions to prevent race conditions
        */
      const clientLimiter = new Bottleneck({ maxConcurrent: 1 })
      const updateInstanceStatus = clientLimiter.wrap(
        client.updateInstanceStatus
      )
      const updateInstance = clientLimiter.wrap(client.updateInstance)
      const createInvocation = clientLimiter.wrap(client.createInvocation)
      const pingInvocation = clientLimiter.wrap(client.pingInvocation)
      const finalizeInvocation = clientLimiter.wrap(client.finalizeInvocation)

      /*
      Handle async setup
      */
      ;(async () => {
        const { version } = instance

        /*
        Obtain empty port
        */
        dbg(`Obtaining port`)
        const [newPort, releasePort] = getNextPort()
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
        const userInstanceLogger = await instanceLoggerService().get(
          instance.id,
          {
            parentLogger: systemInstanceLogger,
          }
        )

        const writeUserLog = serialAsyncExecutionGuard(
          userInstanceLogger.write,
          () => `${instance.id}:userLog`
        )
        shutdownManager.add(() =>
          writeUserLog(`Shutting down instance`).catch(error)
        )

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
        await writeUserLog(`Starting instance`)

        /*
        Spawn the child process
        */
        const childProcess = await (async () => {
          try {
            const cp = await pbService.spawn({
              command: 'serve',
              slug: instance.id,
              port: newPort,
              version,
              onUnexpectedStop: (code, stdout, stderr) => {
                warn(
                  `PocketBase processes exited unexpectedly with ${code}. Putting in maintenance mode.`
                )
                warn(stdout)
                warn(stderr)
                shutdownManager.add(async () => {
                  await updateInstance(instance.id, {
                    maintenance: true,
                  })
                  await writeUserLog(
                    `Putting instance in maintenance mode because it shut down with return code ${code}. `,
                    StreamNames.Error
                  )
                  await Promise.all(
                    stdout.map((data) =>
                      writeUserLog(data, StreamNames.Error).catch(error)
                    )
                  )
                  await Promise.all(
                    stderr.map((data) =>
                      writeUserLog(data, StreamNames.Error).catch(error)
                    )
                  )
                })
                setImmediate(() => {
                  _safeShutdown(
                    new Error(
                      `PocketBase processes exited unexpectedly with ${code}. Putting in maintenance mode.`
                    )
                  ).catch(error)
                })
              },
            })
            return cp
          } catch (e) {
            warn(`Error spawning: ${e}`)
            throw new Error(
              `Could not launch PocketBase ${instance.version}. It may be time to upgrade.`
            )
          }
        })()
        const { pid } = childProcess
        assertTruthy(pid, `Expected PID here but got ${pid}`)
        dbg(`PocketBase instance PID: ${pid}`)
        systemInstanceLogger.breadcrumb(`pid:${pid}`)
        shutdownManager.add(async () => {
          dbg(`killing ${id}`)
          await childProcess.kill().catch(error)
          dbg(`killed ${id}`)
        })

        /*
        Create the invocation record
        */
        healthyGuard()
        const invocation = await createInvocation(instance, pid)
        shutdownManager.add(async () => {
          await finalizeInvocation(invocation).catch(error)
        })

        /**
         * Deno worker
         */
        healthyGuard()
        const denoApi = await (async () => {
          const workerPath = join(
            DAEMON_PB_DATA_DIR,
            instance.id,
            `worker`,
            `index.ts`
          )
          dbg(`Checking ${workerPath} for a worker entry point`)
          if (existsSync(workerPath)) {
            dbg(`Found worker ${workerPath}`)
            healthyGuard()
            await writeUserLog(`Starting worker`)
            healthyGuard()
            const api = await createDenoProcess({
              path: workerPath,
              port: newPort,
              instance,
              logger: instanceServiceLogger,
            })
            return api
          } else {
            dbg(`No worker found at ${workerPath}`)
          }
        })()
        shutdownManager.add(async () => {
          await writeUserLog(`Shutting down worker`).catch(error)
          await denoApi?.shutdown().catch(error)
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
          tm.repeat(
            safeCatch(`idleCheck`, systemInstanceLogger, async () => {
              raw(`idle check: ${openRequestCount} open requests`)
              if (
                openRequestCount === 0 &&
                lastRequest + DAEMON_PB_IDLE_TTL < now()
              ) {
                dbg(`idle for ${DAEMON_PB_IDLE_TTL}, shutting down`)
                healthyGuard()
                await _safeShutdown().catch(error)
                return false
              } else {
                raw(`${openRequestCount} requests remain open`)
              }
              return true
            }),
            RECHECK_TTL
          )
        }

        {
          tm.repeat(
            () =>
              pingInvocation(invocation)
                .then(() => true)
                .catch((e) => {
                  warn(`_pingInvocation failed with ${e}`)
                  return true
                }),
            1000
          )
        }

        dbg(`${internalUrl} is running`)
        status = InstanceApiStatus.Healthy
        healthyGuard()
        await updateInstanceStatus(instance.id, InstanceStatus.Running)
      })().catch((e) => {
        warn(`Instance failed to start with ${e}`)
        _safeShutdown(e).catch(error)
      })

      return api
    }

    const getInstanceByIdOrSubdomain = async (idOrSubdomain: InstanceId) => {
      {
        dbg(`Trying to get instance by ID: ${idOrSubdomain}`)
        const [instance, owner] = await client
          .getInstanceById(idOrSubdomain)
          .catch((e: ClientResponseError) => {
            if (e.status !== 404) {
              throw new Error(
                `Unexpected response ${JSON.stringify(e)} from mothership`
              )
            }
            return []
          })
        if (instance && owner) {
          dbg(`${idOrSubdomain} is an instance ID`)
          return { instance, owner }
        }
      }
      {
        dbg(`Trying to get instance by subdomain: ${idOrSubdomain}`)
        const [instance, owner] = await client.getInstanceBySubdomain(
          idOrSubdomain
        )
        if (instance && owner) {
          dbg(`${idOrSubdomain} is a subdomain`)
          return { instance, owner }
        }
      }
      dbg(`${idOrSubdomain} is neither an instance nor a subdomain`)
      return {}
    }

    ;(await proxyService()).use(
      (subdomain) => subdomain !== PUBLIC_APP_DB,
      ['/api(/*)', '/_(/*)', '(/*)'],
      async (req, res, meta, logger) => {
        const { dbg } = logger
        const { subdomain: instanceIdOrSubdomain, host, proxy } = meta

        // Do not handle central db requests, that is handled separately
        if (instanceIdOrSubdomain === PUBLIC_APP_DB) return

        const { instance, owner } = await getInstanceByIdOrSubdomain(
          instanceIdOrSubdomain
        )
        if (!owner) {
          throw new Error(`Instance owner is invalid`)
        }
        if (!instance) {
          throw new Error(
            `Subdomain ${instanceIdOrSubdomain} does not resolve to an instance`
          )
        }

        /*
        Maintenance check
        */
        dbg(`Checking for maintenance mode`)
        if (instance.maintenance) {
          throw new Error(
            `This instance is in Maintenance Mode. See https://pockethost.gitbook.io/manual/daily-usage/maintenance for more information.`
          )
        }

        /*
        Owner check
        */
        dbg(`Checking for verified account`)
        if (!owner?.verified) {
          throw new Error(
            `Log in at ${PUBLIC_APP_PROTOCOL}://${PUBLIC_APP_DOMAIN} to verify your account.`
          )
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
          } to instance ${api.internalUrl()}`
        )

        proxy.web(req, res, { target: api.internalUrl() })
      },
      `InstanceService`
    )

    const { getNextPort } = await portManager({ maxPorts })

    const shutdown = async () => {
      dbg(`Shutting down instance manager`)
      const p = Promise.all(map(instanceApis, (api) => api.shutdown()))
      await p
    }

    const getInstanceApiIfExistsById = (id: InstanceId) => instanceApis[id]

    return { shutdown, getInstanceApiIfExistsById }
  }
)
