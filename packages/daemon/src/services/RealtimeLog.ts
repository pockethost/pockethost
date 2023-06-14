import { PUBLIC_APP_DB } from '$src/constants'
import {
  InstanceFields,
  mkSingleton,
  RecordId,
  SingletonBaseConfig,
} from '@pockethost/common'
import Bottleneck from 'bottleneck'
import { text } from 'node:stream/consumers'
import pocketbaseEs from 'pocketbase'
import { JsonifiableObject } from 'type-fest/source/jsonifiable'
import { instanceLoggerService } from './InstanceLoggerService'
import { proxyService } from './ProxyService'

export type RealtimeLogConfig = SingletonBaseConfig & {}

const mkEvent = (name: string, data: JsonifiableObject) => {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`
}

export type RealtimeLog = ReturnType<typeof realtimeLog>
export const realtimeLog = mkSingleton(async (config: RealtimeLogConfig) => {
  const { logger } = config
  const _realtimeLogger = logger.create(`RealtimeLog`)
  const { dbg, error } = _realtimeLogger

  ;(await proxyService()).use(
    PUBLIC_APP_DB,
    '/logs',
    async (req, res, meta, logger) => {
      const { subdomain, host, coreInternalUrl } = meta
      if (!req.url?.startsWith('/logs')) {
        return
      }

      const _requestLogger = logger.create(`${subdomain}`)
      const { dbg, error, trace } = _requestLogger

      const write = async (data: any) => {
        return new Promise<void>((resolve) => {
          if (!res.write(data)) {
            // dbg(`Waiting for drain after`, data)
            res.once('drain', resolve)
          } else {
            // dbg(`Waiting for nexttick`, data)
            process.nextTick(resolve)
          }
        })
      }

      /**
       * Extract query params
       */
      dbg(`Got a log request`)
      const parsed = new URL(req.url, `https://${req.headers.host}`)
      if (req.method === 'OPTIONS') {
        // https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader(
          'Access-Control-Allow-Headers',
          'authorization,content-type,cache-control'
        )
        res.setHeader('Access-Control-Max-Age', 86400)
        res.statusCode = 204
        res.end()
        return
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
          `instanceId ${instanceId} not found for user ${user.id}`
        )
      }
      dbg(`Instance is `, instance)

      const limiter = new Bottleneck({ maxConcurrent: 1 })

      /**
       * Get a database connection
       */
      const instanceLogger = await instanceLoggerService().get(instanceId, {
        parentLogger: _requestLogger,
      })
      const { subscribe } = instanceLogger

      /**
       * Start the stream
       */
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=UTF-8',
        Connection: 'keep-alive',
        'Cache-Control': 'no-store',
      })

      /**
       * Track the IDs we send so we don't accidentally send old
       * records in the initial burst (if one is requested)
       */
      let _seenIds: { [_: RecordId]: boolean } | undefined = {}

      const unsub = await subscribe((e) => {
        trace(`Caught db modification ${instanceId}`, e)
        const { table, record } = e
        const evt = mkEvent(`log`, record)
        trace(
          `Dispatching SSE log event from ${instance.subdomain} (${instance.id})`,
          evt
        )
        limiter.schedule(() => write(evt)).catch(error)
      })
      req.on('close', () => {
        limiter.stop()
        dbg(
          `SSE request for ${instance.subdomain} (${instance.id}) closed. Unsubscribing.`
        )
        unsub()
      })

      /**
       * Send initial batch if requested
       */
      if (nInitialRecords > 0) {
        dbg(`Fetching initial ${nInitialRecords} logs to prime history`)
        const recs = await instanceLogger.fetch(nInitialRecords)
        recs
          .sort((a, b) => (a.created < b.created ? -1 : 1))
          .forEach((rec) => {
            limiter
              .schedule(async () => {
                if (_seenIds?.[rec.id]) {
                  trace(`Record ${rec.id} already sent `)
                  return
                } // Skip if update already emitted
                const evt = mkEvent(`log`, rec)
                trace(
                  `Dispatching SSE initial log event from ${instance.subdomain} (${instance.id})`,
                  evt
                )
                return write(evt)
              })
              .catch(error)
          })
        limiter
          .schedule(async () => {
            // Set seenIds to `undefined` so the subscribe listener stops tracking them.
            _seenIds = undefined
          })
          .catch(error)
      }
    },
    `RealtimeLogService`
  )

  return {
    shutdown() {
      dbg(`shutdown`)
    },
  }
})
