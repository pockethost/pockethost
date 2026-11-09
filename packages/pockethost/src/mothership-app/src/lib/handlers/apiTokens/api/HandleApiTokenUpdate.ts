import { parseInstanceScope } from '../lib/parseInstanceScope'

/**
 * PATCH /api/tokens/{id} (JWT auth only). Body: `{ all_instances, instances }`. Changes which instances a token can
 * reach. The secret, label, scopes and expiry are untouched, so CI secrets holding the token keep working.
 */
export const HandleApiTokenUpdate = (e: core.RequestEvent) => {
  const auth = e.auth
  if (!auth) {
    throw new UnauthorizedError('Authentication required.')
  }

  const id = e.request!.pathValue('id')
  let record: core.Record
  try {
    record = $app.findRecordById('api_tokens', id)
  } catch {
    throw new NotFoundError('Token not found.')
  }
  if (record.getString('user') !== auth.id) {
    throw new NotFoundError('Token not found.')
  }

  const body = (e.requestInfo().body || {}) as Record<string, unknown>
  const { allInstances, instanceIds } = parseInstanceScope(body, auth.id)

  record.set('all_instances', allInstances)
  record.set('instances', instanceIds)
  $app.save(record)

  return e.json(200, {
    record: {
      id: record.id,
      all_instances: allInstances,
      instances: instanceIds,
    },
  })
}
