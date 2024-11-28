routerAdd(
  'GET',
  '/api/mirror',
  (c) => {
    return require(`${__hooks}/HandleMirrorData`).HandleMirrorData(c)
  },
  $apis.gzip(),
  $apis.requireAdminAuth(),
)
