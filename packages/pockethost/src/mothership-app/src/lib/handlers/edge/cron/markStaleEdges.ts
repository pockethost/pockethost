const STALE_MS = 30_000
const OFFLINE_MS = 60_000

export const markStaleEdges = () => {
  const now = Date.now()
  const records = $app.findRecordsByFilter('edges', '1=1').filter((r): r is models.Record => !!r)

  for (const record of records) {
    const lastSeenRaw = record.get('last_seen')
    if (!lastSeenRaw) {
      continue
    }

    const lastSeen = new Date(String(lastSeenRaw)).getTime()
    if (Number.isNaN(lastSeen)) {
      continue
    }

    const age = now - lastSeen
    let status = 'online'
    if (age > OFFLINE_MS) {
      status = 'offline'
    } else if (age > STALE_MS) {
      status = 'stale'
    }

    if (record.get('status') !== status) {
      record.set('status', status)
      $app.save(record)
    }
  }
}
