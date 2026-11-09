/**
 * Personal access tokens (PATs). Format: `ph_pat_<id>_<secret>`.
 *
 * - `id` is the 15-character `api_tokens` record ID, used for lookup.
 * - `secret` is 43 base62 characters (~256 bits). Only `sha256(secret)` is stored.
 *
 * Pure helpers only: this file is bundled into the mothership JSVM, so no Node imports.
 */

export const PAT_PREFIX = 'ph_pat_'
export const PAT_SECRET_LENGTH = 43
export const PAT_SECRET_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
export const PAT_MAX_PER_USER = 20
export const PAT_LABEL_MAX = 100

const PAT_RE = /^ph_pat_([a-z0-9]{15})_([0-9A-Za-z]{43})$/

export type ParsedPat = { id: string; secret: string }

export const formatPat = (id: string, secret: string) => `${PAT_PREFIX}${id}_${secret}`

export const looksLikePat = (raw: unknown): raw is string => typeof raw === 'string' && raw.startsWith(PAT_PREFIX)

export const parsePat = (raw: unknown): ParsedPat | null => {
  if (typeof raw !== 'string') return null
  const m = PAT_RE.exec(raw.trim())
  if (!m) return null
  return { id: m[1]!, secret: m[2]! }
}

/** Last 4 characters of the secret, shown in lists as `ph_pat_…abcd`. */
export const patHint = (secret: string) => secret.slice(-4)

export const patDisplay = (hint: string) => `${PAT_PREFIX}…${hint}`

/** Reads `Authorization: Bearer <token>`. Returns the token or null. */
export const bearerToken = (authorization: string | null | undefined): string | null => {
  if (!authorization) return null
  const m = /^Bearer\s+(.+)$/i.exec(authorization.trim())
  return m ? m[1]!.trim() : null
}

export type PatVerifyResult = {
  tokenId: string
  userId: string
  label: string
  scopes: ('read' | 'write')[]
  /** Null = all of the user's instances */
  instanceIds: string[] | null
}

/** True when an ISO/PB date string is set and in the past. */
export const patExpired = (expires: string | null | undefined, nowMs: number) => {
  if (!expires || !expires.trim()) return false
  const t = Date.parse(expires.replace(' ', 'T'))
  if (Number.isNaN(t)) return false
  return t <= nowMs
}
