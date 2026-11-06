import { corsMiddleware } from '@'
import type { RequestHandler, Response } from 'express'
import type { IncomingMessage } from 'http'

/**
 * Reserved secret name. When an instance has it, the firewall applies the listed origins instead of the edge's default
 * `Access-Control-Allow-Origin: *`. PocketBase itself is not involved (no `--origins` flag), so preflights stay at the
 * edge and changes apply without restarting the instance.
 */
export const PH_CORS_ORIGINS_SECRET = 'PH_CORS_ORIGINS'

/** Same as PocketBase's default `AllowMethods`. */
const ALLOW_METHODS = 'GET,HEAD,PUT,PATCH,POST,DELETE'

/** Firewall-owned routes keep today's permissive CORS (the dashboard calls them on custom domains). */
const isFirewallRoute = (path: string) => path.startsWith('/api/firewall/') || path.startsWith('/api/_private/')

/** `a, b ,,b` -> `['a', 'b']`. Returns null when nothing is left. No other validation: we trust the user. */
export const parseCorsOrigins = (raw: unknown): string[] | null => {
  if (typeof raw !== 'string') return null
  const origins = [
    ...new Set(
      raw
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    ),
  ]
  return origins.length > 0 ? origins : null
}

const wildcardToRegExp = (pattern: string) =>
  new RegExp(
    '^' +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.') +
      '$'
  )

/**
 * Mirrors PocketBase's CORS origin matching (apis/middlewares_cors.go): first match in list order wins; `*` allows any
 * origin and is echoed as `*`; an exact match is echoed; `*` / `?` inside an entry are wildcards and echo the request
 * origin. Returns null when the origin isn't allowed.
 */
export const resolveAllowOrigin = (origins: string[], origin: string | undefined): string | null => {
  if (!origin) return null
  for (const o of origins) {
    if (o === '*') return '*'
    if (o === origin) return origin
  }
  if (origin.length <= 253 + 3 + 5 && origin.includes('://')) {
    for (const o of origins) {
      if ((o.includes('*') || o.includes('?')) && wildcardToRegExp(o).test(origin)) return origin
    }
  }
  return null
}

export type InstanceCorsPolicy = {
  /** Value for `Access-Control-Allow-Origin`, or null to send none. */
  allowOrigin: string | null
}

const LOCALS_KEY = 'instanceCors'

export const getInstanceCorsPolicy = (res: Response): InstanceCorsPolicy | undefined => res.locals[LOCALS_KEY]

const appendVary = (res: Response, value: string) => {
  const existing = res.getHeader('Vary')
  const parts = new Set(
    (Array.isArray(existing) ? existing.join(',') : `${existing ?? ''}`)
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  )
  parts.add(value)
  res.setHeader('Vary', Array.from(parts).join(', '))
}

export type InstanceCorsOptions = {
  /** Returns the instance's secrets for a hostname, or undefined if unknown. */
  getInstanceSecrets?: (hostname: string) => Promise<Record<string, string> | undefined | null>
}

/**
 * Replaces the blanket `corsMiddleware` in the firewall.
 *
 * - Instances without `PH_CORS_ORIGINS`, firewall routes, vhosts and unknown hosts: `corsMiddleware`, unchanged.
 * - Instances with it: answer preflights here (PocketBase's semantics, no instance wake, not rate limited) and record the
 *   policy so `rewriteProxiedCorsHeaders` can enforce it on the proxied response.
 */
export const createInstanceCorsMiddleware = ({ getInstanceSecrets }: InstanceCorsOptions): RequestHandler => {
  return async (req, res, next) => {
    let origins: string[] | null = null
    if (getInstanceSecrets && !isFirewallRoute(req.path) && req.hostname) {
      try {
        const secrets = await getInstanceSecrets(req.hostname)
        origins = parseCorsOrigins(secrets?.[PH_CORS_ORIGINS_SECRET])
      } catch {
        origins = null
      }
    }

    if (!origins) {
      corsMiddleware(req, res, next)
      return
    }

    const allowOrigin = resolveAllowOrigin(origins, req.headers.origin)
    res.locals[LOCALS_KEY] = { allowOrigin } satisfies InstanceCorsPolicy
    appendVary(res, 'Origin')
    if (allowOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowOrigin)
    }

    if (req.method !== 'OPTIONS') {
      next()
      return
    }

    if (allowOrigin) {
      appendVary(res, 'Access-Control-Request-Method')
      appendVary(res, 'Access-Control-Request-Headers')
      res.setHeader('Access-Control-Allow-Methods', ALLOW_METHODS)
      const requestedHeaders = req.headers['access-control-request-headers']
      if (requestedHeaders) {
        res.setHeader('Access-Control-Allow-Headers', requestedHeaders)
      }
    }
    res.status(204).end()
  }
}

/**
 * `proxyRes` hook for the daemon proxy. For instances with a CORS policy, drops every `Access-Control-Allow-*` header
 * set further down (the daemon's `*`, PocketBase's own, user hooks) so the firewall's value (already on `res`, or
 * absent for a rejected origin) is the only one the browser sees. httpxy emits `proxyRes` before it copies upstream
 * headers onto `res`, so deleting them here is enough.
 */
export const rewriteProxiedCorsHeaders = (proxyRes: IncomingMessage, res: Response) => {
  if (!getInstanceCorsPolicy(res)) return
  for (const name of Object.keys(proxyRes.headers)) {
    if (name.toLowerCase().startsWith('access-control-allow-')) {
      delete proxyRes.headers[name]
    }
  }
  // Upstream Vary replaces ours; keep Origin in it so caches don't mix responses across origins.
  const vary = proxyRes.headers.vary
  if (vary) {
    const parts = vary
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
    if (!parts.some((v) => v.toLowerCase() === 'origin' || v === '*')) {
      proxyRes.headers.vary = [...parts, 'Origin'].join(', ')
    }
  }
}
