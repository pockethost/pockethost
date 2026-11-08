import { bearerToken } from '$common/pat'
import { verifyPat } from '../../apiTokens/lib/verifyPat'
import { patDenial, type PatNeed } from './instancePolicy'

/**
 * Who is calling an instance endpoint (`PUT`/`DELETE /api/instance/{id}`, `POST /api/instance`): a dashboard session
 * (JWT, `e.auth`) or a personal access token (`Authorization: Bearer ph_pat_…`).
 *
 * The mothership never turns a PAT into `e.auth` (see apiTokens/hooks.ts), so these routes don't use
 * `$apis.requireAuth()`; they call `resolveInstanceCaller` instead, which accepts either.
 */
export type InstanceCaller = {
  userId: string
  via: 'jwt' | 'pat'
}

const deny = (status: 401 | 403 | 404, message: string): never => {
  if (status === 401) throw new UnauthorizedError(message)
  if (status === 403) throw new ForbiddenError(message)
  throw new NotFoundError(message)
}

export const resolveInstanceCaller = (e: core.RequestEvent, need: PatNeed): InstanceCaller => {
  if (e.auth) return { userId: e.auth.id, via: 'jwt' }

  const raw = bearerToken(e.request?.header.get('Authorization'))
  if (!raw) return deny(401, `Sign in to the dashboard or send a personal access token.`)

  const outcome = verifyPat(raw, e.realIP())
  if (!outcome.ok) return deny(outcome.status, outcome.message)

  const denial = patDenial(outcome.result, need)
  if (denial) return deny(denial.status, denial.message)

  return { userId: outcome.user.id, via: 'pat' }
}

/** Loads an instance the caller owns. Missing and not-owned look the same to tokens. */
export const findOwnedInstance = (caller: InstanceCaller, id: string): core.Record => {
  let record: core.Record | undefined
  try {
    record = $app.findRecordById('instances', id)
  } catch {
    record = undefined
  }
  if (!record || record.getString('uid') !== caller.userId) {
    return deny(404, `Instance not found, or you cannot access it.`)
  }
  return record
}
