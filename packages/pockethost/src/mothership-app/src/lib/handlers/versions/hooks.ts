/** Return a list of available PocketBase versions */
routerAdd('GET', '/api/versions', (c) => {
  return require(`${__hooks}/mothership`).HandleVersionsRequest(c)
})
