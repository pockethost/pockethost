/** Return a list of available PocketBase versions */
routerAdd('GET', '/api/versions', (e) => {
  return require(`${__hooks}/mothership`).HandleVersionsRequest(e)
})
