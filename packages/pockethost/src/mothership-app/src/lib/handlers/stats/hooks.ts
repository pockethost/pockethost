routerAdd('GET', '/stats.json', (e) => {
  return require(`${__hooks}/mothership`).HandleStatsRequest(e)
})

onBootstrap((e) => {
  e.next()
  require(`${__hooks}/mothership`).HandleStatsRefreshAtBoot(e)
})

cronAdd('public-stats', '0 * * * *', () => {
  require(`${__hooks}/mothership`).refreshPublicStats()
})
