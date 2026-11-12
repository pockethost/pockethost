routerAdd(
  'GET',
  '/api/userToken/{id}',
  (e) => {
    return require(`${__hooks}/mothership`).HandleUserTokenRequest(e)
  },
  $apis.requireSuperuserAuth()
)

routerAdd(
  'GET',
  '/api/user/trusted-ips',
  (e) => {
    return require(`${__hooks}/mothership`).HandleUserTrustedIpsGet(e)
  },
  $apis.requireAuth()
)

routerAdd(
  'PATCH',
  '/api/user/trusted-ips',
  (e) => {
    return require(`${__hooks}/mothership`).HandleUserTrustedIpsUpdate(e)
  },
  $apis.requireAuth()
)
