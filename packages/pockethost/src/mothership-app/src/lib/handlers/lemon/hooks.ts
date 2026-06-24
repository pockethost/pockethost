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
