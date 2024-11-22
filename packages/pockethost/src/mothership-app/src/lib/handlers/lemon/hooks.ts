routerAdd('POST', '/api/ls', (c) => {
  return require(`${__hooks}/mothership`).HandleLemonSqueezySale(c)
})
