import type { Request, Response } from 'express'
import { text } from 'node:stream/consumers'
import type { JsonObject } from 'type-fest'
import { InstanceFields, Logger, LoggerService, mkSingleton, PocketBase, SingletonBaseConfig, stringify } from '..'
import { InstanceLogReader } from './InstanceLoggerService'
import { proxyService } from './ProxyService'

export type RealtimeLogConfig = SingletonBaseConfig & {}

const mkEvent = (name: string, data: JsonObject) => {
  return `event: ${name}\ndata: ${stringify(data)}\n\n`
}

const handleLogStream = async (req: Request, res: Response, logger: Logger) => {
  const { dbg } = logger.create(`RealtimeLogger`)
  dbg(`Got a logging request`)

  const { coreInternalUrl } = res.locals

  dbg(`Got a log request`)
  const json = await text(req)
  dbg(`JSON payload is`, json)
  const payload = JSON.parse(json)
  dbg(`Parsed payload is`, payload)
  const { instanceId, auth, n: nInitialRecords } = payload

  if (!instanceId) {
    throw new Error(`instanceId query param required in ${req.url}`)
  }
  if (!auth) {
    throw new Error(`Expected 'auth' query param, but found ${req.url}`)
  }

  /** Validate auth token */
  const client = new PocketBase(coreInternalUrl)
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

  /** Validate instance and ownership */
  dbg(`Got a log request for instance ID ${instanceId}`)
  const instance = await client
    .collection('instances')
    .getFirstListItem<InstanceFields>(`id = '${instanceId}' || subdomain='${instanceId}'`)
  if (!instance) {
    throw new Error(`instanceId ${instanceId} not found for user ${user.id}`)
  }
  dbg(`Instance is `, instance)

  /** Get a database connection */
  const instanceLogger = InstanceLogReader(instance.id, `exec`, logger)

  /** Start the stream */
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=UTF-8',
    Connection: 'keep-alive',
    'Cache-Control': 'no-store',
  })

  const unsub = instanceLogger.tail(100, (entry) => {
    const evt = mkEvent(`log`, entry)
    res.write(evt)
  })

  await new Promise<void>((resolve, reject) => {
    res.on('error', reject)
    res.on('close', () => {
      unsub?.()
      resolve()
    })
  })
}

export type RealtimeLog = ReturnType<typeof realtimeLog>
export const realtimeLog = mkSingleton(async (config: RealtimeLogConfig) => {
  ;(await proxyService()).use('/logs', (req, res, next) => {
    if (req.method !== `POST`) {
      next()
      return
    }

    const logger = LoggerService().create(`RealtimeLogger`)
    return handleLogStream(req, res, logger).catch(next)
  })

  return {}
})
