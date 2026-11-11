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

/** Keep users.bonus_instances equal to the sum of the user's bonus_grants */
onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/mothership`).AfterChange_bonusGrant(e)
  e.next()
}, 'bonus_grants')
onRecordAfterUpdateSuccess((e) => {
  require(`${__hooks}/mothership`).AfterChange_bonusGrant(e)
  e.next()
}, 'bonus_grants')
onRecordAfterDeleteSuccess((e) => {
  require(`${__hooks}/mothership`).AfterChange_bonusGrant(e)
  e.next()
}, 'bonus_grants')

/** Customers can't change their own bonus_instances */
onRecordUpdateRequest((e) => {
  require(`${__hooks}/mothership`).BeforeUpdateRequest_guardBonusInstances(e)
  e.next()
}, 'users')
