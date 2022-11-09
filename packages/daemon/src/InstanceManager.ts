import { assertTruthy, binFor, InstanceStatus } from '@pockethost/common'
import { forEachRight, map } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import getPort from 'get-port'
import {
  DAEMON_PB_IDLE_TTL,
  DAEMON_PB_PASSWORD,
  DAEMON_PB_PORT_BASE,
  DAEMON_PB_USERNAME,
  PUBLIC_APP_DOMAIN,
  PUBLIC_APP_PROTOCOL,
  PUBLIC_PB_DOMAIN,
  PUBLIC_PB_PROTOCOL,
  PUBLIC_PB_SUBDOMAIN,
} from './constants'
import { PocketbaseClientApi } from './db/PbClient'
import { dbg, error } from './util/dbg'
import { mkInternalUrl } from './util/internal'
import { now } from './util/now'
import { safeCatch } from './util/safeAsync'
import { tryFetch } from './util/tryFetch'
import { PocketbaseProcess, _spawn } from './util/_spawn'

type Instance = {
  process: PocketbaseProcess
  internalUrl: string
  port: number
  shutdown: () => Promise<void>
  startRequest: () => () => void
}

export const createInstanceManger = async (client: PocketbaseClientApi) => {
  const instances: { [_: string]: Instance } = {}

  const coreInternalUrl = mkInternalUrl(DAEMON_PB_PORT_BASE)
  const mainProcess = await _spawn({
    subdomain: PUBLIC_PB_SUBDOMAIN,
    slug: PUBLIC_PB_SUBDOMAIN,
    port: DAEMON_PB_PORT_BASE,
    bin: binFor('lollipop'),
  })
  instances[PUBLIC_PB_SUBDOMAIN] = {
    process: mainProcess,
    internalUrl: coreInternalUrl,
    port: DAEMON_PB_PORT_BASE,
    shutdown: async () => {
      dbg(`Shutting down instance ${PUBLIC_PB_SUBDOMAIN}`)
      mainProcess.kill()
    },
    startRequest: () => () => {},
  }
  await tryFetch(coreInternalUrl)
  try {
    await client.adminAuthViaEmail(DAEMON_PB_USERNAME, DAEMON_PB_PASSWORD)
  } catch (e) {
    error(
      `***WARNING*** CANNOT AUTHENTICATE TO ${PUBLIC_PB_PROTOCOL}://${PUBLIC_PB_SUBDOMAIN}.${PUBLIC_PB_DOMAIN}/_/`
    )
    error(`***WARNING*** LOG IN MANUALLY, ADJUST .env, AND RESTART DOCKER`)
  }

  const limiter = new Bottleneck({ maxConcurrent: 1 })

  const getInstance = (subdomain: string) =>
    limiter.schedule(async () => {
      // dbg(`Getting instance ${subdomain}`)
      {
        const instance = instances[subdomain]
        if (instance) {
          // dbg(`Found in cache: ${subdomain}`)
          return instance
        }
      }

      dbg(`Checking ${subdomain} for permission`)

      const [instance, owner] = await client.getInstanceBySubdomain(subdomain)
      if (!instance) {
        dbg(`${subdomain} not found`)
        return
      }

      if (!owner?.verified) {
        throw new Error(
          `Log in at ${PUBLIC_APP_PROTOCOL}://${PUBLIC_APP_DOMAIN} to verify your account.`
        )
      }

      await client.updateInstanceStatus(instance.id, InstanceStatus.Port)
      dbg(`${subdomain} found in DB`)
      const exclude = map(instances, (i) => i.port)
      const newPort = await getPort({
        port: DAEMON_PB_PORT_BASE,
        exclude,
      }).catch((e) => {
        console.error(`Failed to get port for ${subdomain}`)
        throw e
      })
      dbg(`Found port for ${subdomain}: ${newPort}`)

      await client.updateInstanceStatus(instance.id, InstanceStatus.Starting)

      const childProcess = await _spawn({
        subdomain,
        slug: instance.id,
        port: newPort,
        bin: binFor(instance.platform, instance.version),
        onUnexpectedStop: (code) => {
          console.warn(`${subdomain} exited unexpectedly with ${code}`)
          api.shutdown()
        },
      })
      const { pid } = childProcess
      assertTruthy(pid, `Expected PID here but got ${pid}`)

      const invocation = await client.createInvocation(instance, pid)
      const api: Instance = (() => {
        let openRequestCount = 0
        let lastRequest = now()
        let tid: ReturnType<typeof setTimeout>
        const internalUrl = mkInternalUrl(newPort)

        const RECHECK_TTL = 1000 // 1 second
        const _api: Instance = {
          process: childProcess,
          internalUrl,
          port: newPort,
          shutdown: safeCatch(
            `Instance ${subdomain} invocation ${invocation.id} pid ${pid} shutdown`,
            async () => {
              clearTimeout(tid)
              await client.finalizeInvocation(invocation)
              const res = childProcess.kill()
              delete instances[subdomain]
              if (subdomain !== PUBLIC_PB_SUBDOMAIN) {
                await client.updateInstanceStatus(
                  instance.id,
                  InstanceStatus.Idle
                )
              }
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
          /**
           * Heartbeat and idle shutdown
           */
          const _beat = async () => {
            dbg(`${subdomain} heartbeat: ${openRequestCount} open requests`)
            await client.pingInvocation(invocation)
            if (
              openRequestCount === 0 &&
              lastRequest + DAEMON_PB_IDLE_TTL < now()
            ) {
              dbg(`${subdomain} idle for ${DAEMON_PB_IDLE_TTL}, shutting down`)
              await _api.shutdown()
            } else {
              dbg(`${openRequestCount} requests remain open on ${subdomain}`)
              tid = setTimeout(_beat, RECHECK_TTL)
            }
          }
          _beat()
        }

        return _api
      })()

      instances[subdomain] = api
      await client.updateInstanceStatus(instance.id, InstanceStatus.Running)
      dbg(`${api.internalUrl} is running`)
      return instances[subdomain]
    })

  const shutdown = () => {
    dbg(`Shutting down instance manager`)
    forEachRight(instances, (instance) => {
      instance.shutdown()
    })
  }
  return { getInstance, shutdown }
}
