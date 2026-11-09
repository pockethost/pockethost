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
  record.set('status', 'online')
  record.set('stats', stats)
  $app.save(record)

  return e.json(200, { ok: true, id: record.id })
}
