onBootstrap((e) => {
  e.next()
  return require(`${__hooks}/mothership`).HandleMetaUpdateAtBoot(e)
})
