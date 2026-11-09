import { getAppStoreJson, setAppStoreJson } from '$util/appStoreJson'

export const LIVE_VIEW_STATS_TOPIC = 'mothership/live/view-stats'

const LIVE_VIEW_STATS_STORE_KEY = 'phLiveViewStats'

export type LiveViewStats = {
  totalUsers: number
  totalLegacySubscribers: number
  totalFreeSubscribers: number
  totalProSubscribers: number
  totalProMonthSubscribers: number
  totalProYearSubscribers: number
  totalFounderSubscribers: number
  totalFlounderSubscribers: number
  newUsersLastHour: number
  newUsersLast24Hours: number
  newUsersLast7Days: number
  newUsersLast30Days: number
  totalInstances: number
  totalInstancesLastHour: number
  totalInstancesLast24Hours: number
  totalInstancesLast7Days: number
  totalInstancesLast30Days: number
  newInstancesLastHour: number
  newInstancesLast24Hours: number
  newInstancesLast7Days: number
  newInstancesLast30Days: number
  updatedAt: string
}

const fieldInt = (record: models.Record, name: string): number => {
  const value = record.get(name)
  if (value == null || value === '') return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const readStatsViewRecord = (record: models.Record): LiveViewStats => {
  return {
    totalUsers: fieldInt(record, 'total_users'),
    totalLegacySubscribers: fieldInt(record, 'total_legacy_subscribers'),
    totalFreeSubscribers: fieldInt(record, 'total_free_subscribers'),
    totalProSubscribers: fieldInt(record, 'total_pro_subscribers'),
    totalProMonthSubscribers: fieldInt(record, 'total_pro_month_subscribers'),
    totalProYearSubscribers: fieldInt(record, 'total_pro_year_subscribers'),
    totalFounderSubscribers: fieldInt(record, 'total_founder_subscribers'),
    totalFlounderSubscribers: fieldInt(record, 'total_flounder_subscribers'),
    newUsersLastHour: fieldInt(record, 'new_users_last_hour'),
    newUsersLast24Hours: fieldInt(record, 'new_users_last_24_hours'),
    newUsersLast7Days: fieldInt(record, 'new_users_last_7_days'),
    newUsersLast30Days: fieldInt(record, 'new_users_last_30_days'),
    totalInstances: fieldInt(record, 'total_instances'),
    totalInstancesLastHour: fieldInt(record, 'total_instances_last_hour'),
    totalInstancesLast24Hours: fieldInt(record, 'total_instances_last_24_hours'),
    totalInstancesLast7Days: fieldInt(record, 'total_instances_last_7_days'),
    totalInstancesLast30Days: fieldInt(record, 'total_instances_last_30_days'),
    newInstancesLastHour: fieldInt(record, 'new_instances_last_hour'),
    newInstancesLast24Hours: fieldInt(record, 'new_instances_last_24_hours'),
    newInstancesLast7Days: fieldInt(record, 'new_instances_last_7_days'),
    newInstancesLast30Days: fieldInt(record, 'new_instances_last_30_days'),
    updatedAt: new Date().toISOString(),
  }
}

export const getLiveViewStats = (): LiveViewStats | null => {
  return getAppStoreJson<LiveViewStats>(LIVE_VIEW_STATS_STORE_KEY)
}

export const refreshLiveViewStats = (): LiveViewStats | null => {
  const record = $app.findFirstRecordByFilter('stats', 'id != ""')
  if (!record) return null

  const stats = readStatsViewRecord(record)
  setAppStoreJson(LIVE_VIEW_STATS_STORE_KEY, stats)
  return stats
}

export const broadcastLiveViewStats = () => {
  const stats = getLiveViewStats()
  if (!stats) return

  const message = new SubscriptionMessage({
    name: LIVE_VIEW_STATS_TOPIC,
    data: JSON.stringify(stats),
  })

  const clients = $app.subscriptionsBroker().clients()
  for (const clientId in clients) {
    if (clients[clientId].hasSubscription(LIVE_VIEW_STATS_TOPIC)) {
      clients[clientId].send(message)
    }
  }
}

export const sendLiveViewStatsToClient = (client: subscriptions.Client) => {
  const stats = getLiveViewStats()
  if (!stats) return

  client.send(
    new SubscriptionMessage({
      name: LIVE_VIEW_STATS_TOPIC,
      data: JSON.stringify(stats),
    })
  )
}

export const initLiveViewStatsAtBoot = () => {
  refreshLiveViewStats()
}

export const handleLiveViewStatsCron = () => {
  if (!refreshLiveViewStats()) return
  broadcastLiveViewStats()
}

export const refreshAndBroadcastLiveViewStats = () => {
  if (!refreshLiveViewStats()) return null
  broadcastLiveViewStats()
  return getLiveViewStats()
}
