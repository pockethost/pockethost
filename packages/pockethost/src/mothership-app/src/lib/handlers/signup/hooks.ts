routerAdd('GET', '/api/signup', (c) => {
  return require(`${__hooks}/mothership`).HandleSignupCheck(c)
})

// https://pocketbase.io/docs/js-routing/#sending-request-to-custom-routes-using-the-sdks
routerAdd('POST', '/api/signup', (c) => {
  return require(`${__hooks}/mothership`).HandleSignupConfirm(c)
})
