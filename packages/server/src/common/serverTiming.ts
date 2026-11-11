import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'http'
import { performance } from 'perf_hooks'

/**
 * Per-hop timing in the standard `Server-Timing` response header, shared with Pocker. Every hop measures from receiving
 * the request to sending the response headers (time to first byte), keeps the entries the next hop sent back, and adds
 * its own after them, so the innermost hop comes first:
 *
 * - `origin` PocketBase: from handing the request to the instance until its response headers came back
 * - `wake` starting the instance (0 when it was already running)
 * - `edge` the edge that owns the instance, total (desc = edge name)
 * - `fwd` the entry edge waiting on the owner edge (desc = "entry>owner")
 * - `entry` the edge Cloudflare connected to, total (desc = edge name)
 *
 * A hop's own overhead is its `dur` minus the entry it wraps. Only edge names go in `desc`, never addresses.
 */
export const SERVER_TIMING = 'Server-Timing'

export type TimingEntry = { name: string; dur: number; desc?: string }

export const msSince = (start: number, now = performance.now()) => Math.max(0, now - start)

/** Pure: one entry, e.g. `edge;dur=63.5;desc="sfo"`. */
export const formatTiming = ({ name, dur, desc }: TimingEntry): string =>
  `${name};dur=${dur.toFixed(1)}${desc ? `;desc="${desc.replace(/["\\]/g, '')}"` : ''}`

type HeaderValue = string | number | string[] | undefined

/** Pure: an existing Server-Timing value (string, list, or absent) with `entries` added after it. */
export const mergeServerTiming = (existing: HeaderValue, entries: TimingEntry[]): string => {
  const prior = existing == null ? [] : Array.isArray(existing) ? existing : [`${existing}`]
  return [...prior.filter((v) => v.trim()), ...entries.map(formatTiming)].join(', ')
}

/** Adds `entries` to the response's Server-Timing header, keeping what upstream hops already put there. */
export const appendServerTiming = (res: ServerResponse, entries: TimingEntry[]) => {
  if (!entries.length || res.headersSent) return
  res.setHeader(SERVER_TIMING, mergeServerTiming(res.getHeader(SERVER_TIMING) as HeaderValue, entries))
}

/**
 * Middleware that adds this hop's entries just before the response headers go out. `entries` gets the time since the
 * request arrived. Put it first so the measurement covers everything this hop does. Proxies that pass headers to
 * `writeHead` directly are handled too.
 */
export const serverTimingMiddleware =
  (entries: (req: IncomingMessage, res: ServerResponse, elapsedMs: number) => TimingEntry[]) =>
  (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const start = performance.now()
    const writeHead = res.writeHead
    let done = false
    res.writeHead = function (this: ServerResponse, ...args: unknown[]) {
      if (!done) {
        done = true
        try {
          const mine = entries(req, res, msSince(start))
          const headersArg = args.find((a, i) => i > 0 && a && typeof a === 'object' && !Array.isArray(a)) as
            | OutgoingHttpHeaders
            | undefined
          const key = headersArg && Object.keys(headersArg).find((k) => k.toLowerCase() === 'server-timing')
          if (headersArg && key) {
            headersArg[key] = mergeServerTiming(headersArg[key] as HeaderValue, mine)
          } else {
            appendServerTiming(res, mine)
          }
        } catch {
          // Timing is diagnostic only; never fail the response over it.
        }
      }
      return (writeHead as (...a: unknown[]) => ServerResponse).apply(this, args)
    } as ServerResponse['writeHead']
    next()
  }
