routerAdd('GET', '/api/signup', (e) => {
  return require(`${__hooks}/mothership`).HandleSignupCheck(e)
})

// https://pocketbase.io/docs/js-routing/#sending-request-to-custom-routes-using-the-sdks
routerAdd('POST', '/api/signup', (e) => {
  return require(`${__hooks}/mothership`).HandleSignupConfirm(e)
})
