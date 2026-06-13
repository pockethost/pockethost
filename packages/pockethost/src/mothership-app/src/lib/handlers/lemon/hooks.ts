routerAdd('POST', '/api/ls', (e) => {
  return require(`${__hooks}/mothership`).HandleLemonSqueezySale(e)
})
