routerAdd(
  'GET',
  '/api/userToken/:id',
  (c) => {
    return require(`${__hooks}/mothership`).HandleUserTokenRequest(c)
  },
  $apis.requireAdminAuth()
)
