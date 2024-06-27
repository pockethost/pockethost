import { text } from 'node:stream/consumers'
import {
  filter,
  PocketHostFilter,
  RequestHandler,
  stringify,
} from 'pockethost/core'
import { JsonifiableObject } from 'type-fest/source/jsonifiable'
import { dbg } from './log'

const mkEvent = (name: string, data: JsonifiableObject) => {
  return `event: ${name}\ndata: ${stringify(data)}\n\n`
}

export const realtimeLogMiddleware: RequestHandler = async (req, res, next) => {
  dbg(`Got a logging request`)

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

  const isAuthenticated = await filter(
    PocketHostFilter.Core_AuthenticateRequest,
    false,
    { req, auth, instanceId },
  )
  if (!isAuthenticated) {
    throw new Error(`Unauthorized`)
  }

  /** Get a database connection */
  const instanceLogger = InstanceLogger(instanceId, `exec`)

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

  res.on('close', () => {
    unsub()
    instanceLogger.shutdown()
  })
}
