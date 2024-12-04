routerAdd(
  'PUT',
  '/api/instance/:id',
  (c) => {
    return require(`${__hooks}/mothership`).HandleInstanceUpdate(c)
  },
  $apis.requireRecordAuth(),
)
routerAdd(
  'POST',
  '/api/instance',
  (c) => {
    return require(`${__hooks}/mothership`).HandleInstanceCreate(c)
  },
  $apis.requireRecordAuth(),
)
routerAdd(
  'DELETE',
  '/api/instance/:id',
  (c) => {
    return require(`${__hooks}/mothership`).HandleInstanceDelete(c)
  },
  $apis.requireRecordAuth(),
)
/** Validate instance version */
onModelBeforeCreate((e) => {
  return require(`${__hooks}/mothership`).HandleInstanceVersionValidation(e)
}, 'instances')

onModelAfterCreate((e) => {
  // return require(`${__hooks}/mothership`).HandleNotifyDiscordAfterCreate(e)
}, 'instances')

onAfterBootstrap((e) => {
  // return require(`${__hooks}/mothership`).HandleMigrateInstanceVersions(e)
})

onAfterBootstrap((e) => {
  // return require(`${__hooks}/mothership`).HandleMigrateRegions(e)
})

/** Reset instance status to idle on start */
onAfterBootstrap((e) => {
  return require(`${__hooks}/mothership`).HandleInstancesResetIdle(e)
})

/** Validate instance version */
onModelBeforeUpdate((e) => {
  return require(`${__hooks}/mothership`).HandleInstanceBeforeUpdate(e)
}, 'instances')
