import { verifyPat } from '../lib/verifyPat'

/** POST /api/pat/verify (superuser). Body: `{ token, ip? }`. Used by edge services; the token is never logged. */
export const HandlePatVerify = (e: core.RequestEvent) => {
  const body = (e.requestInfo().body || {}) as { token?: unknown; ip?: unknown }
  const outcome = verifyPat(body.token, typeof body.ip === 'string' ? body.ip : undefined)
  if (!outcome.ok) {
    return e.json(outcome.status, { status: outcome.status, message: outcome.message })
  }
  return e.json(200, outcome.result)
}
