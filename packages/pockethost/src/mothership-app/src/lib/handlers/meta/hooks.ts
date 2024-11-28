onAfterBootstrap((e) => {
  return require(`${__hooks}/mothership`).HandleMetaUpdateAtBoot(e)
})
