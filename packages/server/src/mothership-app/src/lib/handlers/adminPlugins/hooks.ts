// The `live` admin add-on (pb_admin_ext/live) is registered in Go by `pockethost mothership`, from files embedded in
// the binary: the embedded hooks have no folder on disk to read it from.

onBootstrap((e) => {
  e.next()
  require(`${__hooks}/mothership`).initLiveViewStatsAtBoot()
})

routerAdd(
  'POST',
  '/api/admin/live/platform/refresh',
  (e) => {
    return require(`${__hooks}/mothership`).HandleLivePlatformRefresh(e)
  },
  $apis.requireSuperuserAuth()
)

cronAdd('live-view-stats', '* * * * *', () => {
  const mothership = require(`${__hooks}/mothership`)
  mothership.handleLiveViewStatsCron()
  mothership.handleLivePlatformStatsCron()
})

onRealtimeSubscribeRequest((e) => {
  const mothership = require(`${__hooks}/mothership`)
  const platformTopic = mothership.LIVE_PLATFORM_TOPIC
  const viewStatsTopic = mothership.LIVE_VIEW_STATS_TOPIC

  for (const sub of e.subscriptions) {
    if ((sub === platformTopic || sub === viewStatsTopic) && !e.hasSuperuserAuth()) {
      throw new ForbiddenError('Superuser required for live platform stats')
    }
  }

  e.next()

  for (const sub of e.subscriptions) {
    if (sub === platformTopic) {
      mothership.sendLivePlatformStatsToClient(e.client)
    }
    if (sub === viewStatsTopic) {
      mothership.sendLiveViewStatsToClient(e.client)
    }
  }
})

onRecordAfterCreateSuccess((e) => {
  e.next()
  require(`${__hooks}/mothership`).handleLivePlatformInstanceCreate(e)
}, 'instances')

onRecordAfterUpdateSuccess((e) => {
  e.next()
  require(`${__hooks}/mothership`).handleLivePlatformInstanceUpdate(e)
}, 'instances')

onRecordAfterDeleteSuccess((e) => {
  e.next()
  require(`${__hooks}/mothership`).handleLivePlatformInstanceDelete(e)
}, 'instances')

onRecordAfterCreateSuccess((e) => {
  e.next()
  require(`${__hooks}/mothership`).handleLivePlatformUserCreate(e)
}, 'users')

onRecordAfterUpdateSuccess((e) => {
  e.next()
  require(`${__hooks}/mothership`).handleLivePlatformUserUpdate(e)
}, 'users')

onRecordAfterDeleteSuccess((e) => {
  e.next()
  require(`${__hooks}/mothership`).handleLivePlatformUserDelete(e)
}, 'users')
