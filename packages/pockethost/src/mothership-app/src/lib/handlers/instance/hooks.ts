routerAdd(
  'PUT',
  '/api/instance/:id',
  (c) => {
    return require(`${__hooks}/mothership`).HandleInstanceUpdate(c)
  },
  $apis.requireRecordAuth()
)
routerAdd(
  'POST',
  '/api/instance',
  (c) => {
    return require(`${__hooks}/mothership`).HandleInstanceCreate(c)
  },
  $apis.requireRecordAuth()
)
routerAdd(
  'DELETE',
  '/api/instance/:id',
  (c) => {
    return require(`${__hooks}/mothership`).HandleInstanceDelete(c)
  },
  $apis.requireRecordAuth()
)
routerAdd(
  'GET',
  '/api/instance/resolve',
  (c) => {
    return require(`${__hooks}/mothership`).HandleInstanceResolve(c)
  },
  $apis.requireAdminAuth()
)
/** Validate instance version */
onModelBeforeUpdate((e) => {
  return require(`${__hooks}/mothership`).BeforeUpdate_version(e)
}, 'instances')

/** Validate cname */
onModelBeforeUpdate((e) => {
  return require(`${__hooks}/mothership`).BeforeUpdate_cname(e)
}, 'instances')

/** Notify discord on instance create */
// onModelAfterCreate((e) => {
//   return require(`${__hooks}/mothership`).AfterCreate_notify_discord(e)
// }, 'instances')

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
