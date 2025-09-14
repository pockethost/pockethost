routerAdd(
  'GET',
  '/api/mirror',
  (c) => {
    return require(`${__hooks}/mothership`).HandleMirrorData(c)
  },
  $apis.gzip(),
  $apis.requireSuperuserAuth()
)
