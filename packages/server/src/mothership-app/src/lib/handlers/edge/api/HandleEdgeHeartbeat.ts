export const HandleEdgeHeartbeat = (e: core.RequestEvent) => {
  const { body } = e.requestInfo()
  const edgeId = body?.edge_id

  if (!edgeId || typeof edgeId !== 'string') {
    throw new BadRequestError('edge_id is required')
  }

  const stats = body?.stats ?? {}
  let record: models.Record

  try {
    record = $app.findFirstRecordByData('edges', 'edge_id', edgeId)
  } catch {
    const collection = $app.findCollectionByNameOrId('edges')
    record = new Record(collection)
    record.set('edge_id', edgeId)
    record.set('label', typeof body?.label === 'string' ? body.label : edgeId)
  }

  record.set('last_seen', new Date().toISOString())
  // A clean shutdown reports `offline`, so other edges stop routing to it at once.
  record.set('status', body?.status === 'offline' ? 'offline' : 'online')
  if (typeof body?.region === 'string' && body.region) record.set('region', body.region)
  if (typeof body?.internal_url === 'string') record.set('internal_url', body.internal_url)
  record.set('stats', stats)
  $app.save(record)

  return e.json(200, { ok: true, id: record.id })
}
