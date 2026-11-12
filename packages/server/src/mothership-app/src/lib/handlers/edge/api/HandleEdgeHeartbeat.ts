import { authEdge } from '$util/edgeAuth'

export const HandleEdgeHeartbeat = (e: core.RequestEvent) => {
  const { body } = e.requestInfo()
  const edge = authEdge(e)
  // An edge login reports for itself only; a superuser names the edge (and may create it).
  const edgeId = edge ? edge.getString('edge_id') : body?.edge_id

  if (!edgeId || typeof edgeId !== 'string') {
    throw new BadRequestError('edge_id is required')
  }
  if (edge && body?.edge_id !== undefined && body.edge_id !== edgeId) {
    throw new ForbiddenError(`This login is edge ${edgeId}; it can't report for ${body.edge_id}.`)
  }

  const stats = body?.stats ?? {}
  let record: models.Record

  try {
    record = $app.findFirstRecordByData('edges', 'edge_id', edgeId)
  } catch {
    const collection = $app.findCollectionByNameOrId('edges')
    record = new Record(collection)
    record.set('edge_id', edgeId)
    // `edges` is an auth collection: an edge created here can't log in until a superuser sets its secret.
    record.setRandomPassword()
    record.set('label', typeof body?.label === 'string' ? body.label : edgeId)
  }

  record.set('last_seen', new Date().toISOString())
  // A clean shutdown reports `offline`, so other edges stop routing to it at once.
  record.set('status', body?.status === 'offline' ? 'offline' : 'online')
  if (typeof body?.region === 'string' && /^[a-z][a-z0-9-]{1,14}$/.test(body.region)) {
    ensureRegion(body.region)
    record.set('region', body.region)
  }
  if (typeof body?.internal_url === 'string') record.set('internal_url', body.internal_url)
  record.set('stats', stats)
  $app.save(record)

  return e.json(200, { ok: true, id: record.id })
}

/**
 * A region reported by an edge for the first time gets a record named after its slug; superusers set the name and
 * country in the admin.
 */
const ensureRegion = (slug: string) => {
  try {
    $app.findRecordById('regions', slug)
  } catch {
    const r = new Record($app.findCollectionByNameOrId('regions'))
    r.set('id', slug)
    r.set('name', slug)
    $app.save(r)
  }
}
