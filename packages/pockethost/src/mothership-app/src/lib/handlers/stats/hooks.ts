routerAdd('GET', '/api/stats', (c) => {
  return require(`${__hooks}/mothership`).HandleStatsRequest(c)
})
