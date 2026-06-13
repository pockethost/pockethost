routerAdd(
  'GET',
  '/api/mirror',
  (c) => {
    return require(`${__hooks}/mothership`).HandleMirrorData(c)
  },
  $apis.gzip(),
  $apis.requireAdminAuth()
)
routerAdd(
  'POST',
  '/api/mirror',
  (c) => {
    return require(`${__hooks}/mothership`).HandleMirrorSync(c)
  },
  $apis.gzip(),
  $apis.requireAdminAuth()
)
