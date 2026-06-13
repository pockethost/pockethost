routerAdd('GET', '/api/stats', (e) => {
  return require(`${__hooks}/mothership`).HandleStatsRequest(e)
})
