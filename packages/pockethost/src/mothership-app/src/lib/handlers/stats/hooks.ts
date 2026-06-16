routerAdd('GET', '/stats.json', (c) => {
  return require(`${__hooks}/mothership`).HandleStatsRequest(c)
})

onAfterBootstrap((e) => {
  return require(`${__hooks}/mothership`).HandleStatsRefreshAtBoot(e)
})

cronAdd('public-stats', '0 * * * *', () => {
  require(`${__hooks}/mothership`).refreshPublicStats()
})
