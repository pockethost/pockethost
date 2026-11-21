import { ownerOf } from './instanceOwners'

/**
 * Who is calling an instance endpoint (`PUT`/`DELETE /api/instance/{id}`, `POST /api/instance`, duplicate): the
 * signed-in dashboard user. API tokens (pbt_...) don't reach the mothership's own routes; edges check them for
 * deploys.
 */
export type InstanceCaller = {
  userId: string
}

const deny = (status: 401 | 404, message: string): never => {
  if (status === 401) throw new UnauthorizedError(message)
  throw new NotFoundError(message)
}

export const resolveInstanceCaller = (e: core.RequestEvent): InstanceCaller => {
  if (!e.auth) return deny(401, `Sign in to the dashboard.`)
  return { userId: e.auth.id }
}

/** Loads an instance the caller owns. Missing and not-owned look the same. */
export const findOwnedInstance = (caller: InstanceCaller, id: string): core.Record => {
  let record: core.Record | undefined
  try {
    record = $app.findRecordById('instances', id)
  } catch {
    record = undefined
  }
  if (!record || ownerOf($app, record.id) !== caller.userId) {
    return deny(404, `Instance not found, or you cannot access it.`)
  }
  return record
}
