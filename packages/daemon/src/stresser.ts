import { DEBUG, TRACE } from '$constants'
import { clientService } from '$services'
import { InstanceStatus, logger as loggerService } from '@pockethost/common'
import { random, range, shuffle } from '@s-libs/micro-dash'
import { customAlphabet } from 'nanoid'
import fetch from 'node-fetch'
import { serialAsyncExecutionGuard } from './util/serialAsyncExecutionGuard'

const nanoid = customAlphabet(`abcdefghijklmnop`)

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
  /**
   * Stress test
   */
  const stress = async () => {
    try {
      const instance = shuffle(instances)
        .filter((v) => !excluded[v.id])
        .pop()
      if (!instance) throw new Error(`No instance to grab`)

      const { subdomain, id } = instance
      dbg(`Fetching instance ${subdomain}:${id}`)
      const url = `https://${subdomain}.pockethost.test/_`
      const res = await fetch(url)
      if (res.status !== 200) {
        dbg(`${url} failed with ${res.status}`)
        excluded[id] = true
      }
    } catch (e) {
      error(`${url} failed with: ${e}`)
    } finally {
      setTimeout(stress, random(50, 500))
    }
  }
  range(500).forEach(() => {
    stress()
  })
})()
