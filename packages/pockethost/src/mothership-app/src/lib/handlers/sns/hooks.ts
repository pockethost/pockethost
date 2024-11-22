routerAdd('POST', '/api/sns', (c) => {
  return require(`${__hooks}/mothership`).HandleSesError(c)
})
