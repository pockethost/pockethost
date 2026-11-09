import { createHash } from 'crypto'
import { bearerToken, looksLikePat, type PatVerifyResult } from '../../common/pat'

export type DeployAuth = {
  userId: string
  scopes: ('read' | 'write')[]
  /** Null = every instance the user owns */
  instanceIds: string[] | null
  via: 'pat' | 'jwt'
  tokenLabel: string
}

export class DeployAuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string
  ) {
    super(message)
  }
}

export type PatVerifier = (token: string, ip?: string) => Promise<PatVerifyResult>
export type JwtVerifier = (token: string) => Promise<{ userId: string }>

export const AUTH_CACHE_TTL_MS = 30_000
/**
 * A `fresh` resolve re-verifies only when the cached entry is at least this old, so it can't be used to flood the
 * mothership.
 */
export const AUTH_FRESH_MIN_AGE_MS = 2_000

/**
 * Resolves `Authorization: Bearer <PAT or PocketBase JWT>`. Results (including failures) are cached for 30 seconds, so
 * a revoked token stops working within that window. Pass `{ fresh: true }` to re-verify a cached entry (used when a
 * cached PAT doesn't cover the requested instance, so widening a token's instances takes effect at once).
 */
export const createDeployAuthResolver = (deps: {
  verifyPat: PatVerifier
  verifyJwt: JwtVerifier
  now?: () => number
  ttlMs?: number
  freshMinAgeMs?: number
}) => {
  const now = deps.now ?? Date.now
  const ttl = deps.ttlMs ?? AUTH_CACHE_TTL_MS
  const freshMinAge = deps.freshMinAgeMs ?? AUTH_FRESH_MIN_AGE_MS
  const cache = new Map<string, { at: number; value: DeployAuth | DeployAuthError }>()

  const resolve = async (
    authorization: string | undefined,
    ip?: string,
    opts: { fresh?: boolean } = {}
  ): Promise<DeployAuth> => {
    const token = bearerToken(authorization)
    if (!token) {
      throw new DeployAuthError(401, `Missing token. Set POCKETHOST_TOKEN or run 'pockethost token set'.`)
    }
    const key = createHash('sha256').update(token).digest('hex')
    const hit = cache.get(key)
    const maxAge = opts.fresh ? freshMinAge : ttl
    if (hit && now() - hit.at < maxAge) {
      if (hit.value instanceof DeployAuthError) throw hit.value
      return hit.value
    }
    if (cache.size > 10_000) cache.clear()

    let value: DeployAuth | DeployAuthError
    try {
      if (looksLikePat(token)) {
        const r = await deps.verifyPat(token, ip)
        value = { userId: r.userId, scopes: r.scopes, instanceIds: r.instanceIds, via: 'pat', tokenLabel: r.label }
      } else {
        const r = await deps.verifyJwt(token)
        value = { userId: r.userId, scopes: ['read', 'write'], instanceIds: null, via: 'jwt', tokenLabel: '' }
      }
    } catch (e) {
      if (e instanceof DeployAuthError) {
        value = e
      } else {
        // Infrastructure failure (mothership unreachable): don't cache.
        throw e
      }
    }
    cache.set(key, { at: now(), value })
    if (value instanceof DeployAuthError) throw value
    return value
  }

  return { resolve, clear: () => cache.clear() }
}
