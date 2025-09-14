routerAdd(
  'PUT',
  '/api/instance/{id}',
  (c) => {
    return require(`${__hooks}/mothership`).HandleInstanceUpdate(c)
  },
  $apis.requireAuth()
)
routerAdd(
  'POST',
  '/api/instance',
  (c) => {
    return require(`${__hooks}/mothership`).HandleInstanceCreate(c)
  },
  $apis.requireAuth()
)
routerAdd(
  'DELETE',
  '/api/instance/{id}',
  (c) => {
    return require(`${__hooks}/mothership`).HandleInstanceDelete(c)
  },
  $apis.requireAuth()
)
routerAdd(
  'GET',
  '/api/instance/resolve',
  (c) => {
    return require(`${__hooks}/mothership`).HandleInstanceResolve(c)
  },
  $apis.requireSuperuserAuth()
)
/** Validate instance version */
onRecordUpdate((e) => {
  return require(`${__hooks}/mothership`).BeforeUpdate_version(e)
}, 'instances')

/** Validate cname */
onRecordUpdate((e) => {
  return require(`${__hooks}/mothership`).BeforeUpdate_cname(e)
}, 'instances')

/** Notify discord on instance create */
// onModelAfterCreate((e) => {
//   return require(`${__hooks}/mothership`).AfterCreate_notify_discord(e)
// }, 'instances')

onBootstrap((e) => {
  // return require(`${__hooks}/mothership`).HandleMigrateInstanceVersions(e)
})

onBootstrap((e) => {
  // return require(`${__hooks}/mothership`).HandleMigrateRegions(e)
})

/** Reset instance status to idle on start */
onBootstrap((e) => {
  return require(`${__hooks}/mothership`).HandleInstancesResetIdle(e)
})
