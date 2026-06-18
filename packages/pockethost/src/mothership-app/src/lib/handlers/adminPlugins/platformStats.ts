import { getAppStoreJson, setAppStoreJson, updateAppStoreJson } from '$util/appStoreJson'
import { refreshAndBroadcastLiveViewStats } from './viewStats'

export const LIVE_PLATFORM_TOPIC = 'mothership/live/platform'

const LIVE_PLATFORM_STORE_KEY = 'phLivePlatformCounts'

const INSTANCE_STATUS_KEYS = ['running', 'starting', 'porting', 'vacuuming', 'idle', 'failed'] as const

export type LivePlatformStats = {
  statusCounts: Record<string, number>
  totalUsers: number
  verifiedUsers: number
  unverifiedUsers: number
  updatedAt: string
}

export const normalizeInstanceStatus = (raw: string): string | null => {
  const status = (raw || '').trim()
  if (!status) return null
  if (INSTANCE_STATUS_KEYS.includes(status as (typeof INSTANCE_STATUS_KEYS)[number])) return status
  return null
}

const emptyStatusCounts = (): Record<string, number> => {
  const counts: Record<string, number> = {}
  for (const key of INSTANCE_STATUS_KEYS) {
    counts[key] = 0
  }
  return counts
}

const countInstanceStatus = (key: string): number => {
  return $app.countRecords('instances', $dbx.exp(`status = {:status}`, { status: key }))
}

const countVerifiedUsers = (): number => {
  return $app.countRecords('verified_users')
}

const countUnverifiedUsers = (): number => {
  return $app.countRecords('unverified_users')
}

export const getLivePlatformStats = (): LivePlatformStats | null => {
  const stats = getAppStoreJson<LivePlatformStats>(LIVE_PLATFORM_STORE_KEY)
  if (!stats?.statusCounts) return null
  return stats
}

export const recountLivePlatformStats = (): LivePlatformStats => {
  const statusCounts = emptyStatusCounts()
  for (const key of INSTANCE_STATUS_KEYS) {
    statusCounts[key] = countInstanceStatus(key)
  }

  const stats: LivePlatformStats = {
    statusCounts,
    totalUsers: $app.countRecords('users'),
    verifiedUsers: countVerifiedUsers(),
    unverifiedUsers: countUnverifiedUsers(),
    updatedAt: new Date().toISOString(),
  }

  setAppStoreJson(LIVE_PLATFORM_STORE_KEY, stats)
  return stats
}

const emptyLivePlatformStats = (): LivePlatformStats => ({
  statusCounts: emptyStatusCounts(),
  totalUsers: 0,
  verifiedUsers: 0,
  unverifiedUsers: 0,
  updatedAt: new Date().toISOString(),
})

const applyStatusDelta = (delta: Record<string, number>) => {
  updateAppStoreJson<LivePlatformStats>(LIVE_PLATFORM_STORE_KEY, (old) => {
    const stats = old || emptyLivePlatformStats()
    const statusCounts = { ...stats.statusCounts }

    for (const key of Object.keys(delta)) {
      const next = (statusCounts[key] || 0) + delta[key]
      statusCounts[key] = next < 0 ? 0 : next
    }

    return {
      ...stats,
      statusCounts,
      updatedAt: new Date().toISOString(),
    }
  })
}

const applyUserDelta = (delta: number) => {
  updateAppStoreJson<LivePlatformStats>(LIVE_PLATFORM_STORE_KEY, (old) => {
    const stats = old || emptyLivePlatformStats()
    const next = stats.totalUsers + delta

    return {
      ...stats,
      totalUsers: next < 0 ? 0 : next,
      updatedAt: new Date().toISOString(),
    }
  })
}

const applyVerifiedDelta = (verifiedDelta: number, unverifiedDelta: number) => {
  updateAppStoreJson<LivePlatformStats>(LIVE_PLATFORM_STORE_KEY, (old) => {
    const stats = old || emptyLivePlatformStats()
    const nextVerified = (stats.verifiedUsers || 0) + verifiedDelta
    const nextUnverified = (stats.unverifiedUsers || 0) + unverifiedDelta

    return {
      ...stats,
      verifiedUsers: nextVerified < 0 ? 0 : nextVerified,
      unverifiedUsers: nextUnverified < 0 ? 0 : nextUnverified,
      updatedAt: new Date().toISOString(),
    }
  })
}

export const broadcastLivePlatformStats = () => {
  const stats = getLivePlatformStats()
  if (!stats) return

  const message = new SubscriptionMessage({
    name: LIVE_PLATFORM_TOPIC,
    data: JSON.stringify(stats),
  })

  const clients = $app.subscriptionsBroker().clients()
  for (const clientId in clients) {
    if (clients[clientId].hasSubscription(LIVE_PLATFORM_TOPIC)) {
      clients[clientId].send(message)
    }
  }
}

export const sendLivePlatformStatsToClient = (client: subscriptions.Client) => {
  const stats = getLivePlatformStats()
  if (!stats) return

  client.send(
    new SubscriptionMessage({
      name: LIVE_PLATFORM_TOPIC,
      data: JSON.stringify(stats),
    })
  )
}

const bumpStatus = (from: string | null, to: string | null) => {
  const delta: Record<string, number> = {}
  if (from) delta[from] = (delta[from] || 0) - 1
  if (to) delta[to] = (delta[to] || 0) + 1
  if (!Object.keys(delta).length) return

  applyStatusDelta(delta)
  broadcastLivePlatformStats()
}

export const initLivePlatformStatsAtBoot = () => {
  recountLivePlatformStats()
}

/** Full DB recount + SSE broadcast. Safety net for incremental drift (mirror bulk reset, missed hooks). */
export const refreshAndBroadcastLivePlatformStats = () => {
  const stats = recountLivePlatformStats()
  broadcastLivePlatformStats()
  return stats
}

export const handleLivePlatformStatsCron = () => {
  refreshAndBroadcastLivePlatformStats()
}

export const HandleLivePlatformRefresh = (e: core.RequestEvent) => {
  const stats = refreshAndBroadcastLivePlatformStats()
  refreshAndBroadcastLiveViewStats()
  return e.json(200, stats)
}

export const handleLivePlatformInstanceCreate = (e: core.RecordEvent) => {
  const status = normalizeInstanceStatus(e.record.getString('status'))
  if (!status) return
  bumpStatus(null, status)
}

export const handleLivePlatformInstanceUpdate = (e: core.RecordEvent) => {
  const next = normalizeInstanceStatus(e.record.getString('status'))
  const prev = normalizeInstanceStatus(e.record.original().getString('status'))
  if (next === prev) return
  bumpStatus(prev, next)
}

export const handleLivePlatformInstanceDelete = (e: core.RecordEvent) => {
  const status = normalizeInstanceStatus(e.record.getString('status'))
  if (!status) return
  bumpStatus(status, null)
}

export const handleLivePlatformUserCreate = (e: core.RecordEvent) => {
  applyUserDelta(1)
  const verified = e.record.getBool('verified')
  applyVerifiedDelta(verified ? 1 : 0, verified ? 0 : 1)
  broadcastLivePlatformStats()
}

export const handleLivePlatformUserDelete = (e: core.RecordEvent) => {
  applyUserDelta(-1)
  const verified = e.record.getBool('verified')
  applyVerifiedDelta(verified ? -1 : 0, verified ? 0 : -1)
  broadcastLivePlatformStats()
}

export const handleLivePlatformUserUpdate = (e: core.RecordEvent) => {
  const next = e.record.getBool('verified')
  const prev = e.record.original().getBool('verified')
  if (next === prev) return
  applyVerifiedDelta(next ? 1 : -1, next ? -1 : 1)
  broadcastLivePlatformStats()
}
