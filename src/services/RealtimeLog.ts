import {
  InstanceFields,
  LoggerService,
  mkSingleton,
  SingletonBaseConfig,
} from '$shared'
import { text } from 'node:stream/consumers'
import pocketbaseEs from 'pocketbase'
import { JsonifiableObject } from 'type-fest/source/jsonifiable'
import { InstanceLogger } from './InstanceLoggerService'
import { proxyService } from './ProxyService'

export type RealtimeLogConfig = SingletonBaseConfig & {}

const mkEvent = (name: string, data: JsonifiableObject) => {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`
}

export type RealtimeLog = ReturnType<typeof realtimeLog>
export const realtimeLog = mkSingleton(async (config: RealtimeLogConfig) => {
  ;(await proxyService()).use('/logs', async (req, res, next) => {
    const logger = LoggerService().create(`RealtimeLogger`)
    const { dbg, error, trace } = logger
    dbg(`Got a logging request`)

    const { coreInternalUrl } = res.locals

    dbg(`Got a log request`)
    const parsed = new URL(req.url, `https://${req.headers.host}`)

    const json = await text(req)
    dbg(`JSON payload is`, json)
    const payload = JSON.parse(json)
    dbg(`Parsed payload is`, parsed)
    const { instanceId, auth, n: nInitialRecords } = payload

    if (!instanceId) {
      throw new Error(`instanceId query param required in ${req.url}`)
    }
    if (!auth) {
      throw new Error(`Expected 'auth' query param, but found ${req.url}`)
    }

    /**
     * Validate auth token
     */
    const client = new pocketbaseEs(coreInternalUrl)
    client.authStore.loadFromCookie(auth)
    dbg(`Cookie here is`, client.authStore.isValid)
    await client.collection('users').authRefresh()
    if (!client.authStore.isValid) {
      throw new Error(`Cookie is invalid her`)
    }
    const user = client.authStore.model
    if (!user) {
      throw new Error(`Valid user expected here`)
    }
    dbg(`Cookie auth passed)`)

    /**
     * Validate instance and ownership
     */
    dbg(`Got a log request for instance ID ${instanceId}`)
    const instance = await client
      .collection('instances')
      .getOne<InstanceFields>(instanceId)
    if (!instance) {
      throw new Error(`instanceId ${instanceId} not found for user ${user.id}`)
    }
    dbg(`Instance is `, instance)

    /**
     * Get a database connection
     */
    const instanceLogger = InstanceLogger(instanceId, `exec`)

    /**
     * Start the stream
     */
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=UTF-8',
      Connection: 'keep-alive',
      'Cache-Control': 'no-store',
    })

    const unsub = instanceLogger.tail(100, (entry) => {
      const evt = mkEvent(`log`, entry)
      res.write(evt)
    })

    res.on('close', unsub)
  })

  return {}
})
