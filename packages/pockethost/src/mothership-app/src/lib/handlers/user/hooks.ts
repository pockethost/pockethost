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

  const original = record.original()
  const previous = readTrustedIpsFromRecord(original)
  const current = readTrustedIpsFromRecord(record)

  if (JSON.stringify(previous) === JSON.stringify(current)) return

  require(`${__hooks}/mothership`).validateUserTrustedIps(record)
}, 'users')

function readTrustedIpsFromRecord(record: models.Record): unknown {
  try {
    return record.get(`trusted_ips`)
  } catch {
    return null
  }
}
