import { parsePat, patExpired, type PatVerifyResult } from '$common/pat'

export type PatVerifyOutcome =
  | { ok: true; result: PatVerifyResult; token: core.Record; user: core.Record }
  | { ok: false; status: 401 | 403; message: string }

const TOUCH_INTERVAL_MS = 60_000

const invalid = (): PatVerifyOutcome => ({ ok: false, status: 401, message: 'Invalid or expired token.' })

/** Looks up a PAT, checks the hash in constant time, expiry and account suspension. */
export const verifyPat = (raw: unknown, ip?: string): PatVerifyOutcome => {
  const parsed = parsePat(raw)
  if (!parsed) return invalid()

  let token: core.Record
  try {
    token = $app.findRecordById('api_tokens', parsed.id)
  } catch {
    return invalid()
  }

  if (!$security.equal(token.getString('secret_hash'), $security.sha256(parsed.secret))) {
    return invalid()
  }

  if (patExpired(token.getString('expires'), Date.now())) {
    return invalid()
  }

  let user: core.Record
  try {
    user = $app.findRecordById('users', token.getString('user'))
  } catch {
    return invalid()
  }

  const suspension = user.getString('suspension').trim()
  if (suspension) {
    return { ok: false, status: 403, message: suspension }
  }

  const lastUsed = Date.parse(token.getString('last_used').replace(' ', 'T'))
  if (Number.isNaN(lastUsed) || Date.now() - lastUsed > TOUCH_INTERVAL_MS) {
    try {
      token.set('last_used', new DateTime())
      if (ip) token.set('last_used_ip', `${ip}`.slice(0, 64))
      $app.unsafeWithoutHooks().save(token)
    } catch {
      // Best effort; never fail auth over bookkeeping.
    }
  }

  const scopes = (token.getStringSlice('scopes') || []).filter(
    (s: string): s is 'read' | 'write' => s === 'read' || s === 'write'
  )
  const instanceIds = token.getBool('all_instances') ? null : [...(token.getStringSlice('instances') || [])]

  return {
    ok: true,
    token,
    user,
    result: {
      tokenId: token.id,
      userId: user.id,
      label: token.getString('label'),
      scopes,
      instanceIds,
    },
  }
}
