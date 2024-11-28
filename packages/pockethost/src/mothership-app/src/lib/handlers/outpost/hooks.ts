routerAdd('GET', '/api/unsubscribe', (c) => {
  return require(`${__hooks}/mothership`).HandleOutpostUnsubscribe(c)
})
