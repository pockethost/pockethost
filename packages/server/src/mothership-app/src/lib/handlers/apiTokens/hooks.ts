/**
 * Personal access tokens. The mothership never turns a PAT into `e.auth`, so `$apis.requireAuth()` routes and
 * collection rules stay JWT-only: a PAT cannot create tokens, manage SSH keys, or mint a JWT. PATs are checked only by
 * the explicit routes below and by edge services through /api/pat/verify.
 */
routerAdd(
  'POST',
  '/api/tokens',
  (e) => {
    return require(`${__hooks}/mothership`).HandleApiTokenCreate(e)
  },
  $apis.requireAuth('users')
)

routerAdd(
  'PATCH',
  '/api/tokens/{id}',
  (e) => {
    return require(`${__hooks}/mothership`).HandleApiTokenUpdate(e)
  },
  $apis.requireAuth('users')
)

routerAdd(
  'POST',
  '/api/pat/verify',
  (e) => {
    return require(`${__hooks}/mothership`).HandlePatVerify(e)
  },
  $apis.requireAuth('_superusers', 'edges')
)

routerAdd('GET', '/api/pat/whoami', (e) => {
  return require(`${__hooks}/mothership`).HandlePatWhoami(e)
})

routerAdd('GET', '/api/pat/instances', (e) => {
  return require(`${__hooks}/mothership`).HandlePatInstances(e)
})
