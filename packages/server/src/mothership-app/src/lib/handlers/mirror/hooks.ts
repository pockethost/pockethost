routerAdd(
  'GET',
  '/api/mirror',
  (e) => {
    return require(`${__hooks}/mothership`).HandleMirrorData(e)
  },
  $apis.gzip(),
  $apis.requireSuperuserAuth()
)
routerAdd(
  'POST',
  '/api/mirror',
  (e) => {
    return require(`${__hooks}/mothership`).HandleMirrorSync(e)
  },
  $apis.gzip(),
  $apis.requireSuperuserAuth()
)
