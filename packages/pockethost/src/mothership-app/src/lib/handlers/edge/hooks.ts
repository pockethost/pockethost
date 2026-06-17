routerAdd(
  'POST',
  '/api/edge/heartbeat',
  (e) => {
    return require(`${__hooks}/mothership`).HandleEdgeHeartbeat(e)
  },
  $apis.requireSuperuserAuth()
)

cronAdd('edges-stale', '* * * * *', () => {
  require(`${__hooks}/mothership`).markStaleEdges()
})
