import { InstanceStatus } from '@pockethost/common'
import { map } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import getPort from 'get-port'
import fetch from 'node-fetch'
import {
  APP_DOMAIN,
  CORE_PB_PASSWORD,
  CORE_PB_PORT,
  CORE_PB_SUBDOMAIN,
  CORE_PB_USERNAME,
  PB_IDLE_TTL,
} from './constants'
import { createPbClient } from './PbClient'

type Instance = {
  process: ChildProcessWithoutNullStreams
  internalUrl: string
  port: number
  heartbeat: (shouldStop?: boolean) => void
}

const ROOT_DIR = `/mount/pocketbase`
const BIN_ROOT = `${ROOT_DIR}/bin`
const INSTANCES_ROOT = `${ROOT_DIR}/instances`

const tryFetch = (url: string) =>
  new Promise<void>((resolve, reject) => {
    const tryFetch = () => {
      console.log(`Trying to connect to instance ${url} `)
      fetch(url)
        .then(() => {
          console.log(`Connection to ${url} successful`)
          resolve()
        })
        .catch((e) => {
          console.error(`Could not connect to ${url}`)
          setTimeout(tryFetch, 1000)
        })
    }
    tryFetch()
  })

const mkInternalAddress = (port: number) => `127.0.0.1:${port}`
const mkInternalUrl = (port: number) => `http://${mkInternalAddress(port)}`

export const createInstanceManger = async () => {
  const instances: { [_: string]: Instance } = {}

  const _spawn = async (cfg: {
    subdomain: string
    port: number
    bin: string
  }) => {
    const { subdomain, port, bin } = cfg
    const cmd = `${BIN_ROOT}/${bin}`
    const args = [
      `serve`,
      `--dir`,
      `${INSTANCES_ROOT}/${subdomain}/pb_data`,
      `--http`,
      mkInternalAddress(port),
    ]
    console.log(`Spawning ${subdomain}`, { cmd, args })
    const ls = spawn(cmd, args)

    ls.stdout.on('data', (data) => {
      console.log(`${subdomain} stdout: ${data}`)
    })

    ls.stderr.on('data', (data) => {
      console.error(`${subdomain} stderr: ${data}`)
    })

    ls.on('close', (code) => {
      console.log(`${subdomain} closed with code ${code}`)
    })
    ls.on('exit', (code) => {
      instances[subdomain]?.heartbeat(true)
      delete instances[subdomain]
      client.updateInstanceStatus(subdomain, InstanceStatus.Idle)
      console.log(`${subdomain} exited with code ${code}`)
    })
    ls.on('error', (err) => {
      console.log(`${subdomain} had error ${err}`)
    })

    await tryFetch(mkInternalUrl(port))
    return ls
  }

  const coreInternalUrl = mkInternalUrl(CORE_PB_PORT)
  const client = createPbClient(coreInternalUrl)
  const mainProcess = await _spawn({
    subdomain: CORE_PB_SUBDOMAIN,
    port: CORE_PB_PORT,
    bin: 'pocketbase',
  })
  instances[CORE_PB_SUBDOMAIN] = {
    process: mainProcess,
    internalUrl: coreInternalUrl,
    port: CORE_PB_PORT,
    heartbeat: () => {},
  }
  await tryFetch(coreInternalUrl)
  try {
    await client.adminAuthViaEmail(CORE_PB_USERNAME, CORE_PB_PASSWORD)
  } catch (e) {
    console.error(
      `***WARNING*** CANNOT AUTHENTICATE TO https://${CORE_PB_SUBDOMAIN}.${APP_DOMAIN}/_/`
    )
    console.error(
      `***WARNING*** LOG IN MANUALLY, ADJUST .env, AND RESTART DOCKER`
    )
  }

  const limiter = new Bottleneck({ maxConcurrent: 1 })

  const getInstance = (subdomain: string) =>
    limiter.schedule(async () => {
      console.log(`Getting instance ${subdomain}`)
      {
        const instance = instances[subdomain]
        if (instance) {
          console.log(`Found in cache: ${subdomain}`)
          instance.heartbeat()
          return instance
        }
      }

      console.log(`Checking ${subdomain} for permission`)

      const recs = await client.getInstanceBySubdomain(subdomain)
      const [instance] = recs.items
      if (!instance) {
        console.log(`${subdomain} not found`)
        return
      }

      await client.updateInstanceStatus(subdomain, InstanceStatus.Port)
      console.log(`${subdomain} found in DB`)
      const exclude = map(instances, (i) => i.port)
      const newPort = await getPort({
        port: 8090,
        exclude,
      }).catch((e) => {
        console.error(`Failed to get port for ${subdomain}`)
        throw e
      })
      console.log(`Found port for ${subdomain}: ${newPort}`)

      await client.updateInstanceStatus(subdomain, InstanceStatus.Starting)
      const childProcess = await _spawn({
        subdomain,
        port: newPort,
        bin: instance.bin || 'pocketbase',
      })

      const internalUrl = mkInternalUrl(newPort)

      const api: Instance = {
        process: childProcess,
        internalUrl,
        port: newPort,
        heartbeat: (() => {
          let tid: ReturnType<typeof setTimeout>
          const _cleanup = () => {
            childProcess.kill()
          }
          tid = setTimeout(_cleanup, PB_IDLE_TTL)
          return (shouldStop) => {
            clearTimeout(tid)
            if (!shouldStop) {
              tid = setTimeout(_cleanup, PB_IDLE_TTL)
            }
          }
        })(),
      }
      instances[subdomain] = api
      await client.updateInstanceStatus(subdomain, InstanceStatus.Running)
      console.log(`${internalUrl} is running`)
      return instances[subdomain]
    })

  return { getInstance }
}
