import { mkLog } from '$util/Logger'

export type PublicStats = {
  updatedAt: string
  developers: number
  instances: number
}

export const mkPublicStatsPath = () => `${$app.dataDir()}/stats.json`

export const refreshPublicStats = () => {
  const log = mkLog('refreshPublicStats')
  const db = $app.db()

  const users = new DynamicModel({ total: 0 })
  db.newQuery('SELECT COUNT(*) as total FROM users').one(users)

  const instances = new DynamicModel({ total: 0 })
  db.newQuery('SELECT COUNT(*) as total FROM instances').one(instances)

  const stats: PublicStats = {
    updatedAt: new Date().toISOString(),
    developers: users.total,
    instances: instances.total,
  }

  $os.writeFile(mkPublicStatsPath(), JSON.stringify(stats), 0o644)
  log(`Wrote stats.json`, stats)
  return stats
}
