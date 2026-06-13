onBootstrap((e) => {
  e.next()
  require(`${__hooks}/mothership`).HandleMetaUpdateAtBoot(e)
})
