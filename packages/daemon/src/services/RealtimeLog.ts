import {
  InstanceFields,
  LoggerService,
  mkSingleton,
  SingletonBaseConfig,
} from '@pockethost/common'
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
  const _realtimeLogger = LoggerService().create(`RealtimeLog`)
  const { dbg, error } = _realtimeLogger

  ;(await proxyService()).use(
    '*',
    '/logs',
    async (req, res, meta, logger) => {
      const { subdomain, host, coreInternalUrl } = meta
      if (!req.url?.startsWith('/logs')) {
        return false
      }

      const _requestLogger = logger.create(`${subdomain}`)
      const { dbg, error, trace } = _requestLogger

      /**
       * Extract query params
       */
      dbg(`Got a log request`)
      const parsed = new URL(req.url, `https://${req.headers.host}`)
      // https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', '*')
      res.setHeader('Access-Control-Max-Age', 86400)
      if (req.method === 'OPTIONS') {
        res.statusCode = 204
        res.end()
        return true
      }
      // dbg(`Parsed URL is`, parsed)

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
        throw new Error(
          `instanceId ${instanceId} not found for user ${user.id}`,
        )
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
      return true
    },
    `RealtimeLogService`,
  )

  return {}
})
