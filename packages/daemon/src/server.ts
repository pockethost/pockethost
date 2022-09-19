import { assertExists } from '@pockethost/common/src/assert'
import {
  getAllInstancesById,
  setInstance,
} from '@pockethost/common/src/pocketbase'
import {
  InstanceId,
  InstanceStatuses,
  Password,
  pocketNow,
  Port,
  ProcessId,
  Subdomain,
  Username,
} from '@pockethost/common/src/schema'
import { map } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { exec, spawn } from 'child_process'
import { mkdir, writeFile } from 'fs'
import getPort from 'get-port'
import { identity } from 'ts-brand'
import util from 'util'
import {
  adminAuthViaEmail,
  getAllInternalInstancesByInstanceId,
  linkInternalInstance,
  setInternalInstance,
  setInternalInstancePort,
} from './internal'
import { NGINX_TEMPLATE } from './nginx-template'
import { pidIsRunning } from './pidIsRunning'

const pMkdir = util.promisify(mkdir)
const pWriteFile = util.promisify(writeFile)
const pExec = util.promisify(exec)

const singleLimiter = new Bottleneck({ maxConcurrent: 1 })

const HOME_DIR = `/home/pockethost`
const DATA_ROOT = `${HOME_DIR}/data`

spawn(`pocketbase`, [
  `serve`,
  `--dir`,
  `${DATA_ROOT}/pockethost-central/pb_data`,
  `--http`,
  `127.0.0.1:8090`,
])
;(async () => {
  await adminAuthViaEmail(
    identity<Username>(`ben@pockethost.io`),
    identity<Password>('c6j3ARgcUvut')
  )

  console.log(`logged in as admin`)

  // Subscribe to changes in any record from the "demo" collection
  //   client.realtime.subscribe('instances', function (e) {
  //     console.log(`record changed`, e.record)
  //   })

  // alternatively you can also fetch all records at once via getFullList:
  const _check = async () => {
    console.log(`Fetching current state`)
    const [allInstances, allInternalInstances] = await Promise.all([
      getAllInstancesById(),
      getAllInternalInstancesByInstanceId(),
    ])

    let needsNginx = false
    const nginxConfigs: string[] = [
      NGINX_TEMPLATE(
        identity<Subdomain>(`pockethost-central`),
        identity<Port>(8090)
      ),
    ]

    const provision = (() => {
      const instances: InstanceId[] = []

      const add = (instanceId: InstanceId, status: InstanceStatuses) => {
        if (instances.indexOf(instanceId) < 0) {
          instances.push(instanceId) // Track this instance
        }
        console.log(`${instanceId} status is ${status}`)
        return setInstance(instanceId, {
          status,
        })
      }
      const finish = () => {
        const p = Promise.all(
          instances.map((instanceId) =>
            setInstance(instanceId, { status: InstanceStatuses.Started })
          )
        )
        instances.length = 0
        return p
      }

      return { add, finish }
    })()

    await Promise.all(
      map(allInstances, async (instance, instanceId) => {
        const ROOT_DIR = `${DATA_ROOT}/${instance.subdomain}`
        const LOG_DIR = `${ROOT_DIR}/logs`
        const DATA_DIR = `${ROOT_DIR}/pb_data`

        console.log(`Examining instance ${instanceId}`)
        if (!allInternalInstances[instanceId]) {
          console.log(`${instanceId} linking internal`)
          await provision.add(instanceId, InstanceStatuses.Provisioning)
          allInternalInstances[instanceId] = await linkInternalInstance(
            instanceId
          ).catch((e) => {
            console.error(`${instanceId} error linking internal`)
            throw e
          })
          console.log(`${instanceId} done linking internal`)
        }
        const internalInstance = allInternalInstances[instanceId]
        assertExists(internalInstance, `Expected instance here`)

        if (!internalInstance.port) {
          const exclude = map(allInternalInstances, (i) => i.port).filter(
            (v) => !!v
          )
          console.log(`${instanceId} needs port`, exclude)
          await provision.add(instanceId, InstanceStatuses.Port)

          const newPort = identity<Port>(
            await getPort({
              port: 8090,
              exclude,
            }).catch((e) => {
              console.error(`Failed to get port`)
              throw e
            })
          )
          await setInternalInstancePort(internalInstance.id, newPort)
          internalInstance.port = newPort
          console.log(`${instanceId} port ${newPort}`)
          needsNginx = true
        }

        if (!internalInstance.certCreatedAt) {
          console.log(`${instanceId} needs cert`)
          await provision.add(instanceId, InstanceStatuses.Cert)

          const CERTBOT_CMD = `certbot certonly --keep --agree-tos --nginx --email pockethost@benallfree.com -d ${instance.subdomain}.pockethost.io`
          await singleLimiter
            .schedule(() => pExec(CERTBOT_CMD))
            .catch((e) => {
              console.error(`${instanceId} certbot error: ${e}`)
              throw e
            })
          const certCreatedAt = pocketNow()
          await setInternalInstance(internalInstance.id, {
            certCreatedAt,
          })
          internalInstance.certCreatedAt = certCreatedAt
          console.log(`${instanceId} cert created at ${certCreatedAt}`)
          needsNginx = true
        }

        await Promise.all([
          pMkdir(LOG_DIR, { recursive: true }),
          pMkdir(DATA_DIR, { recursive: true }),
        ])

        needsNginx = needsNginx || !internalInstance.nginxCreatedAt
        nginxConfigs.push(
          NGINX_TEMPLATE(instance.subdomain, internalInstance.port)
        )

        if (!internalInstance.pid || !pidIsRunning(internalInstance.pid)) {
          console.log(`${instanceId} PocketHost instance is not running`)
          await provision.add(instanceId, InstanceStatuses.Starting)

          const child = spawn(`pocketbase`, [
            `serve`,
            `--dir`,
            DATA_DIR,
            `--http`,
            `127.0.0.1:${internalInstance.port}`,
          ])
          const { pid } = child
          assertExists<ProcessId>(pid, `Expected PID for ${instanceId}`)
          const launchedAt = pocketNow()
          setInternalInstance(internalInstance.id, {
            pid,
            launchedAt,
          })
          internalInstance.pid = pid
          internalInstance.launchedAt = launchedAt

          console.log(
            `${instanceId} PocketHost instance is running on PID ${pid}`
          )
        }
      })
    )
    if (needsNginx) {
      console.log(`NGINX needs a rebuild`)
      const configs = nginxConfigs.join(`\n`)
      console.log(`NGINX config`)
      const NGINX_CONF = `/etc/nginx/sites-enabled/_instances`
      await pWriteFile(NGINX_CONF, configs).catch((e) => {
        console.error(`Error writing nginx conf: ${e}`)
        throw e
      })
      await pExec(`systemctl reload nginx`)
      await Promise.all(
        map(allInternalInstances, async (internalInstance) => {
          const nginxCreatedAt = pocketNow()
          setInternalInstance(internalInstance.id, { nginxCreatedAt })
        })
      )
    }

    await provision.finish()
    console.log(`Finished with everything, checking again soon`)
  }
  const _recheck = () => {
    setTimeout(
      () =>
        _check()
          .catch((e) => {
            console.error(`Check failed: ${e}`)
          })
          .finally(() => {
            setImmediate(_recheck)
          }),
      1000
    )
  }
  _recheck()
})().catch((e) => {
  console.error(`Fatal error`, e)
})
