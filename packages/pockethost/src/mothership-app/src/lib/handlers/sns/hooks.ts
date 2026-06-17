routerAdd('POST', '/api/sns', (e) => {
  return require(`${__hooks}/mothership`).HandleSesError(e)
})
