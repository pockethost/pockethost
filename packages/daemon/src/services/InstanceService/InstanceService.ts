import {
  DAEMON_PB_DATA_DIR,
  DAEMON_PB_IDLE_TTL,
  DAEMON_PB_PORT_BASE,
  PUBLIC_APP_DB,
  PUBLIC_APP_DOMAIN,
  PUBLIC_APP_PROTOCOL,
} from '$constants'
import { clientService, proxyService, rpcService } from '$services'
import { mkInternalUrl, now } from '$util'
import {
  assertTruthy,
  CreateInstancePayload,
  CreateInstancePayloadSchema,
  CreateInstanceResult,
  createTimerManager,
  InstanceId,
  InstanceStatus,
  mkSingleton,
  RpcCommands,
  safeCatch,
  SaveSecretsPayload,
  SaveSecretsPayloadSchema,
  SaveSecretsResult,
  SingletonBaseConfig,
} from '@pockethost/common'
import { forEachRight, map } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { existsSync } from 'fs'
import getPort from 'get-port'
import { join } from 'path'
import { AsyncReturnType } from 'type-fest'
import { instanceLoggerService } from '../InstanceLoggerService'
import { pocketbase, PocketbaseProcess } from '../PocketBaseService'
import { createDenoProcess } from './Deno/DenoProcess'

type InstanceApi = {
  process: PocketbaseProcess
  internalUrl: string
  port: number
  shutdown: () => Promise<void>
  startRequest: () => () => void
}

export type InstanceServiceConfig = SingletonBaseConfig & {}

export type InstanceServiceApi = AsyncReturnType<typeof instanceService>
export const instanceService = mkSingleton(
  async (config: InstanceServiceConfig) => {
    const { logger } = config
    const _instanceLogger = logger.create('InstanceService')
    const { dbg, raw, error, warn } = _instanceLogger
    const { client } = await clientService()

    const { registerCommand } = await rpcService()

    const pbService = await pocketbase()

    registerCommand<CreateInstancePayload, CreateInstanceResult>(
      RpcCommands.CreateInstance,
      CreateInstancePayloadSchema,
      async (rpc) => {
        const { payload } = rpc
        const { subdomain } = payload
        const instance = await client.createInstance({
          subdomain,
          uid: rpc.userId,
          version: (await pocketbase()).getLatestVersion(),
          status: InstanceStatus.Idle,
          secondsThisMonth: 0,
          isBackupAllowed: false,
          secrets: {},
        })
        return { instance }
      }
    )

    registerCommand<SaveSecretsPayload, SaveSecretsResult>(
      RpcCommands.SaveSecrets,
      SaveSecretsPayloadSchema,
      async (job) => {
        const { payload } = job
        const { instanceId, secrets } = payload
        await client.updateInstance(instanceId, { secrets })
        return { status: 'saved' }
      }
    )

    const instances: { [_: string]: InstanceApi } = {}

    const instanceLimiter = new Bottleneck({ maxConcurrent: 1 })

    const getInstance = (subdomain: string) =>
      instanceLimiter
        .schedule(async () => {
          const _subdomainLogger = _instanceLogger.create(subdomain)
          const { dbg, warn, error } = _subdomainLogger
          dbg(`Getting instance`)
          {
            const instance = instances[subdomain]
            if (instance) {
              dbg(`Found in cache`)
              return instance
            }
          }
          const clientLimiter = new Bottleneck({ maxConcurrent: 1 })
          const [instance, owner] = await clientLimiter.schedule(() =>
            client.getInstanceBySubdomain(subdomain)
          )
          if (!instance) {
            throw new Error(
              `Instance ${subdomain} not found. Please check the instance URL and try again, or create one at ${PUBLIC_APP_PROTOCOL}://${PUBLIC_APP_DOMAIN}.`
            )
          }
          dbg(`Instance found`)
          _subdomainLogger.breadcrumb(instance.id)

          dbg(`Checking for verified account`)
          if (!owner?.verified) {
            throw new Error(
              `Log in at ${PUBLIC_APP_PROTOCOL}://${PUBLIC_APP_DOMAIN} to verify your account.`
            )
          }

          dbg(`Obtaining port`)
          await clientLimiter.schedule(() =>
            client.updateInstanceStatus(instance.id, InstanceStatus.Port)
          )
          const exclude = map(instances, (i) => i.port)
          const newPort = await getPort({
            port: DAEMON_PB_PORT_BASE,
            exclude,
          }).catch((e) => {
            error(`Failed to get port for ${subdomain}`)
            throw e
          })
          _subdomainLogger.breadcrumb(newPort.toString())
          dbg(`Found port: ${newPort}`)

          const instanceLogger = await instanceLoggerService().get(
            instance.id,
            { parentLogger: _subdomainLogger }
          )

          await clientLimiter.schedule(() => {
            dbg(`Instance status: starting`)
            return client.updateInstanceStatus(
              instance.id,
              InstanceStatus.Starting
            )
          })

          dbg(`Starting instance`)
          await instanceLogger.write(`Starting instance`)
          const childProcess = await (async () => {
            try {
              const cp = await pbService.spawn({
                command: 'serve',
                slug: instance.id,
                port: newPort,
                version: instance.version,
                onUnexpectedStop: (code) => {
                  warn(`${subdomain} exited unexpectedly with ${code}`)
                  api.shutdown()
                },
              })
              return cp
            } catch (e) {
              throw new Error(
                `Could not launch PocketBase ${instance.version}. It may be time to upgrade.`
              )
            }
          })()

          const { pid } = childProcess
          assertTruthy(pid, `Expected PID here but got ${pid}`)
          dbg(`PocketBase instance PID: ${pid}`)

          if (!instance.isBackupAllowed) {
            dbg(`Backups are now allowed`)
            await clientLimiter.schedule(() =>
              client.updateInstance(instance.id, { isBackupAllowed: true })
            )
          }

          const invocation = await clientLimiter.schedule(() =>
            client.createInvocation(instance, pid)
          )

          /**
           * Deno worker
           */
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
              await instanceLogger.write(`Starting worker`)
              const api = await createDenoProcess({
                path: workerPath,
                port: newPort,
                instance,
                logger: _instanceLogger,
              })
              return api
            } else {
              dbg(`No worker found at ${workerPath}`)
            }
          })()

          const tm = createTimerManager({})
          const api: InstanceApi = (() => {
            let openRequestCount = 0
            let lastRequest = now()
            const internalUrl = mkInternalUrl(newPort)

            const RECHECK_TTL = 1000 // 1 second
            const _api: InstanceApi = {
              process: childProcess,
              internalUrl,
              port: newPort,
              shutdown: safeCatch(
                `Instance ${subdomain} invocation ${invocation.id} pid ${pid} shutdown`,
                _subdomainLogger,
                async () => {
                  dbg(`Shutting down`)
                  await instanceLogger.write(`Shutting down instance`)
                  await instanceLogger.write(`Shutting down worker`)
                  await denoApi?.shutdown()
                  tm.shutdown()
                  await clientLimiter.schedule(() =>
                    client.finalizeInvocation(invocation)
                  )
                  const res = childProcess.kill()
                  delete instances[subdomain]
                  await clientLimiter.schedule(() =>
                    client.updateInstanceStatus(
                      instance.id,
                      InstanceStatus.Idle
                    )
                  )
                  assertTruthy(
                    res,
                    `Expected child process to exit gracefully but got ${res}`
                  )
                }
              ),
              startRequest: () => {
                lastRequest = now()
                openRequestCount++
                const id = openRequestCount
                dbg(`${subdomain} started new request ${id}`)
                return () => {
                  openRequestCount--
                  dbg(`${subdomain} ended request ${id}`)
                }
              },
            }

            {
              tm.repeat(
                safeCatch(`idleCheck`, _subdomainLogger, async () => {
                  raw(
                    `${subdomain} idle check: ${openRequestCount} open requests`
                  )
                  if (
                    openRequestCount === 0 &&
                    lastRequest + DAEMON_PB_IDLE_TTL < now()
                  ) {
                    dbg(
                      `${subdomain} idle for ${DAEMON_PB_IDLE_TTL}, shutting down`
                    )
                    await _api.shutdown()
                    return false
                  } else {
                    raw(
                      `${openRequestCount} requests remain open on ${subdomain}`
                    )
                  }
                  return true
                }),
                RECHECK_TTL
              )
            }

            {
              const uptime = safeCatch(`uptime`, _subdomainLogger, async () => {
                raw(`${subdomain} uptime`)
                await clientLimiter.schedule(() =>
                  client.pingInvocation(invocation)
                )
                return true
              })
              tm.repeat(
                () =>
                  uptime().catch((e) => {
                    warn(`Ignoring error`)
                    return true
                  }),
                1000
              )
            }

            return _api
          })()

          instances[subdomain] = api
          await clientLimiter.schedule(() =>
            client.updateInstanceStatus(instance.id, InstanceStatus.Running)
          )
          dbg(`${api.internalUrl} is running`)
          return api
        })
        .catch((e) => {
          warn(`Failed to fetch ${subdomain} with ${e}`)
          throw e
        })

    const shutdown = () => {
      dbg(`Shutting down instance manager`)
      forEachRight(instances, (instance) => {
        instance.shutdown()
      })
    }

    ;(await proxyService()).use(
      (subdomain) => subdomain !== PUBLIC_APP_DB,
      ['/api(/*)', '/_(/*)', '(/*)'],
      async (req, res, meta, logger) => {
        const { subdomain, host, proxy } = meta

        // Do not handle central db requests, that is handled separately
        if (subdomain === PUBLIC_APP_DB) return

        const instance = await getInstance(subdomain)

        if (req.closed) {
          throw new Error(`Request already closed.`)
        }

        dbg(
          `Forwarding proxy request for ${req.url} to instance ${instance.internalUrl}`
        )

        const endRequest = instance.startRequest()
        res.on('close', endRequest)
        proxy.web(req, res, { target: instance.internalUrl })
      },
      `InstanceService`
    )

    const maintenance = async (instanceId: InstanceId) => {}
    return { getInstance, shutdown, maintenance }
  }
)
