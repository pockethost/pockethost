routerAdd(
  'POST',
  '/api/ls/checkout',
  (e) => {
    return require(`${__hooks}/mothership`).HandleLemonSqueezyCheckout(e)
  },
  $apis.requireAuth()
)

routerAdd(
  'POST',
  '/api/ls/cancel',
  (e) => {
    return require(`${__hooks}/mothership`).HandleLemonSqueezyCancel(e)
  },
  $apis.requireAuth()
)

routerAdd('POST', '/api/ls', (e) => {
  return require(`${__hooks}/mothership`).HandleLemonSqueezySale(e)
})

routerAdd(
  'POST',
  '/api/ls/reconcile',
  (e) => {
    return require(`${__hooks}/mothership`).HandleLemonSqueezyReconcile(e)
  },
  $apis.requireSuperuserAuth()
)

routerAdd(
  'POST',
  '/api/loyalty/backfill',
  (e) => {
    return require(`${__hooks}/mothership`).HandleLoyaltyBackfill(e)
  },
  $apis.requireSuperuserAuth()
)

routerAdd('GET', '/api/loyalty/resume', (e) => {
  return require(`${__hooks}/mothership`).HandleLoyaltyResumePage(e)
})

routerAdd('POST', '/api/loyalty/resume', (e) => {
  return require(`${__hooks}/mothership`).HandleLoyaltyResume(e)
})
