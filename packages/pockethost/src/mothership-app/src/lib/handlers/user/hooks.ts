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

onRecordUpdate((e) => {
  const record = e.record
  if (!record) return

  const mothership = require(`${__hooks}/mothership`)
  const previous = mothership.readTrustedIpsFromRecord(record.original())
  const current = mothership.readTrustedIpsFromRecord(record)

  if (JSON.stringify(previous) === JSON.stringify(current)) return

  mothership.validateUserTrustedIps(record)
}, 'users')
