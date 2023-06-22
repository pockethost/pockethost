import { DEBUG, TRACE } from '$constants'
import { clientService } from '$services'
import {
  InstanceId,
  InstanceStatus,
  logger as loggerService,
} from '@pockethost/common'
import { random, range, shuffle, values } from '@s-libs/micro-dash'
import { customAlphabet } from 'nanoid'
import fetch from 'node-fetch'
import { serialAsyncExecutionGuard } from './util/serialAsyncExecutionGuard'

const nanoid = customAlphabet(`abcdefghijklmnop`)

const THREAD_COUNT = 1
const REQUESTS_PER_THREAD = 1

loggerService({ debug: DEBUG, trace: TRACE, errorTrace: !DEBUG })

// npm install eventsource --save
//@ts-ignore
global.EventSource = require('eventsource')
;(async () => {
  const logger = loggerService().create(`stresser.ts`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)
  info(DEBUG)

  const [nodePath, scriptPath, url] = process.argv
  if (!url) {
    throw new Error(`URL is required (http://127.0.0.1:8090)`)
  }

  const _unsafe_createInstance = async () => {
    await client.createInstance({
      subdomain: `stress-${nanoid()}`,
      uid: shuffle(users).pop()!.id,
      status: InstanceStatus.Idle,
      version: `~0.${random(1, 16)}.0`,
      secondsThisMonth: 0,
      secrets: {},
      maintenance: false,
    })
  }
  const createInstance = serialAsyncExecutionGuard(_unsafe_createInstance)

  /**
   * Create instances
   */
  const { client } = await clientService({ url, logger })
  const users = await client.client.collection('users').getFullList()
  dbg(users)
  await Promise.all(range(10).map(() => createInstance()))
  const instances = await client.getInstances()
  dbg(`Instances ${instances.length}`)

  const excluded: { [_: string]: boolean } = {}
  const resetInstance = serialAsyncExecutionGuard(
    async (instanceId: InstanceId) => {
      if (excluded[instanceId]) return
      await client.updateInstance(instanceId, { maintenance: false })
    },
    (id) => `reset:${id}`
  )

  /**
   * Stress test
   */
  const stress = async () => {
    try {
      const instance = shuffle(instances)
        .filter((v) => !excluded[v.id])
        .pop()
      dbg(
        `There are ${instances.length} instances and ${
          values(excluded).length
        } excluded`
      )
      if (!instance) throw new Error(`No instance to grab`)

      {
        const { subdomain, id } = instance
        await resetInstance(id)
        const thisLogger = logger.create(subdomain)
        thisLogger.breadcrumb(id)

        await Promise.all(
          range(REQUESTS_PER_THREAD).map(async (i) => {
            const requestLogger = thisLogger.create(`${i}`)
            const { dbg } = requestLogger
            const url = `https://${subdomain}.pockethost.test/_`
            dbg(`Fetching ${url}`)
            const res = await fetch(url)
            if (res.status !== 200) {
              const body = res.body?.read().toString()
              dbg(`${url} response error ${res.status} ${body}`)
              if (body?.match(/maintenance/i)) {
                dbg(`Maintenance mode detected. Excluding`)
                excluded[id] = true
              }
              if (res.status === 403 && !!body?.match(/Timeout/)) {
                return // Timeout
              }
            }
          })
        )
      }
    } catch (e) {
      error(`${url} failed with: ${e}`, JSON.stringify(e))
    } finally {
      setTimeout(stress, random(50, 500))
    }
  }
  range(THREAD_COUNT).forEach(() => {
    stress()
  })
})()
