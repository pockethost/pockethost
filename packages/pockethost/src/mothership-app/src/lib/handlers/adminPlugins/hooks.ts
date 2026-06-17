$app.onServe().bindFunc((e) => {
  e.uiExtensions.push({
    name: 'live',
    fs: $os.dirFS(`${__hooks}/../pb_admin_ext/live`),
  })
  e.next()
})

onBootstrap((e) => {
  e.next()
  require(`${__hooks}/mothership`).initLivePlatformStatsAtBoot()
})

routerAdd(
  'POST',
  '/api/admin/live/platform/refresh',
  (e) => {
    return require(`${__hooks}/mothership`).HandleLivePlatformRefresh(e)
  },
  $apis.requireSuperuserAuth()
)

onRealtimeSubscribeRequest((e) => {
  const topic = require(`${__hooks}/mothership`).LIVE_PLATFORM_TOPIC

  for (const sub of e.subscriptions) {
    if (sub === topic && !e.hasSuperuserAuth()) {
      throw new ForbiddenError('Superuser required for live platform stats')
    }
  }

  e.next()

  for (const sub of e.subscriptions) {
    if (sub === topic) {
      require(`${__hooks}/mothership`).sendLivePlatformStatsToClient(e.client)
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

onRecordAfterDeleteSuccess((e) => {
  e.next()
  require(`${__hooks}/mothership`).handleLivePlatformUserDelete(e)
}, 'users')
