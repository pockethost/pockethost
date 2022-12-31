import {
  assertTruthy,
  CreateInstancePayload,
  CreateInstancePayloadSchema,
  CreateInstanceResult,
  createTimerManager,
  InstanceId,
  InstanceStatus,
  logger,
  mkSingleton,
  RpcCommands,
} from '@pockethost/common'
import { forEachRight, map } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import getPort from 'get-port'
import { AsyncReturnType } from 'type-fest'
import { clientService } from '../clientService/clientService'
import {
  DAEMON_PB_IDLE_TTL,
  DAEMON_PB_PORT_BASE,
  PUBLIC_APP_DOMAIN,
  PUBLIC_APP_PROTOCOL,
} from '../constants'
import { mkInternalUrl } from '../util/internal'
import { now } from '../util/now'
import { safeCatch } from '../util/promiseHelper'
import { pocketbase, PocketbaseProcess } from './PocketBaseService'
import { rpcService } from './RpcService'

type InstanceApi = {
  process: PocketbaseProcess
  internalUrl: string
  port: number
  shutdown: () => Promise<void>
  startRequest: () => () => void
}

export type InstanceServiceConfig = {}

export type InstanceServiceApi = AsyncReturnType<typeof instanceService>
export const instanceService = mkSingleton(
  async (config: InstanceServiceConfig) => {
    const { dbg, raw, error, warn } = logger().create('InstanceService')
    const client = await clientService()

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
          platform: 'unused',
          secondsThisMonth: 0,
          isBackupAllowed: false,
        })
        return { instance }
      }
    )

    const instances: { [_: string]: InstanceApi } = {}

    const instanceLimiter = new Bottleneck({ maxConcurrent: 1 })

    const getInstance = (subdomain: string) =>
      instanceLimiter.schedule(async () => {
        // dbg(`Getting instance ${subdomain}`)
        {
          const instance = instances[subdomain]
          if (instance) {
            // dbg(`Found in cache: ${subdomain}`)
            return instance
          }
        }

        const clientLimiter = new Bottleneck({ maxConcurrent: 1 })

        dbg(`Checking ${subdomain} for permission`)

        const [instance, owner] = await clientLimiter.schedule(() =>
          client.getInstanceBySubdomain(subdomain)
        )
        if (!instance) {
          dbg(`${subdomain} not found`)
          return
        }

        if (!owner?.verified) {
          throw new Error(
            `Log in at ${PUBLIC_APP_PROTOCOL}://${PUBLIC_APP_DOMAIN} to verify your account.`
          )
        }

        await clientLimiter.schedule(() =>
          client.updateInstanceStatus(instance.id, InstanceStatus.Port)
        )
        dbg(`${subdomain} found in DB`)
        const exclude = map(instances, (i) => i.port)
        const newPort = await getPort({
          port: DAEMON_PB_PORT_BASE,
          exclude,
        }).catch((e) => {
          error(`Failed to get port for ${subdomain}`)
          throw e
        })
        dbg(`Found port for ${subdomain}: ${newPort}`)

        await clientLimiter.schedule(() =>
          client.updateInstanceStatus(instance.id, InstanceStatus.Starting)
        )

        const childProcess = await pbService.spawn({
          command: 'serve',
          slug: instance.id,
          port: newPort,
          version: instance.version,
          onUnexpectedStop: (code) => {
            warn(`${subdomain} exited unexpectedly with ${code}`)
            api.shutdown()
          },
        })

        const { pid } = childProcess
        assertTruthy(pid, `Expected PID here but got ${pid}`)

        if (!instance.isBackupAllowed) {
          await client.updateInstance(instance.id, { isBackupAllowed: true })
        }

        const invocation = await clientLimiter.schedule(() =>
          client.createInvocation(instance, pid)
        )
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
              async () => {
                tm.shutdown()
                await clientLimiter.schedule(() =>
                  client.finalizeInvocation(invocation)
                )
                const res = childProcess.kill()
                delete instances[subdomain]
                await clientLimiter.schedule(() =>
                  client.updateInstanceStatus(instance.id, InstanceStatus.Idle)
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
              safeCatch(`idleCheck`, async () => {
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
            const uptime = safeCatch(`uptime`, async () => {
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
        return instances[subdomain]
      })

    const shutdown = () => {
      dbg(`Shutting down instance manager`)
      forEachRight(instances, (instance) => {
        instance.shutdown()
      })
    }

    const maintenance = async (instanceId: InstanceId) => {}
    return { getInstance, shutdown, maintenance }
  }
)
