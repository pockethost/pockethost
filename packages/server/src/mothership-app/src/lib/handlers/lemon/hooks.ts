// Open to guests: pay-first signup checks out before the account exists (the handler uses the auth when present).
routerAdd('POST', '/api/ls/checkout', (e) => {
  return require(`${__hooks}/mothership`).HandleLemonSqueezyCheckout(e)
})

// Pay-first account claim (common/billing/accountClaim.ts).
routerAdd('POST', '/api/claim/status', (e) => {
  return require(`${__hooks}/mothership`).HandleClaimStatus(e)
})
routerAdd('POST', '/api/claim/complete', (e) => {
  return require(`${__hooks}/mothership`).HandleClaimComplete(e)
})
routerAdd(
  'POST',
  '/api/claim/attach',
  (e) => {
    return require(`${__hooks}/mothership`).HandleClaimAttach(e)
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
