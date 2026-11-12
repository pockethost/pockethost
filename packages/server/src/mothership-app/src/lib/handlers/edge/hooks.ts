routerAdd(
  'POST',
  '/api/edge/heartbeat',
  (e) => {
    return require(`${__hooks}/mothership`).HandleEdgeHeartbeat(e)
  },
  $apis.requireAuth('_superusers', 'edges')
)

cronAdd('edges-stale', '* * * * *', () => {
  require(`${__hooks}/mothership`).markStaleEdges()
})

// Edges read users through the records API and realtime (mirror drift checks, live updates). PocketBase leaves out
// another auth record's email unless it's public; edges need it, as superusers always got it.
onRecordEnrich((e) => {
  const auth = e.requestInfo?.auth
  if (auth && auth.collection().name === 'edges') e.record?.ignoreEmailVisibility(true)
  e.next()
}, 'users')
