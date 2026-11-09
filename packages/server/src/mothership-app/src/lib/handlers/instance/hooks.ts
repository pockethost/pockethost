/**
 * Instance endpoints accept a dashboard session (JWT) or a personal access token, so they don't use
 * `$apis.requireAuth()`. Each handler authenticates with `resolveInstanceCaller` (instance/lib/instanceCaller.ts).
 */
routerAdd('PUT', '/api/instance/{id}', (e) => {
  return require(`${__hooks}/mothership`).HandleInstanceUpdate(e)
})
routerAdd('POST', '/api/instance', (e) => {
  return require(`${__hooks}/mothership`).HandleInstanceCreate(e)
})
routerAdd('DELETE', '/api/instance/{id}', (e) => {
  return require(`${__hooks}/mothership`).HandleInstanceDelete(e)
})
routerAdd(
  'POST',
  '/api/instances/runtime/reset',
  (e) => {
    return require(`${__hooks}/mothership`).HandleInstancesRuntimeReset(e)
  },
  $apis.requireSuperuserAuth()
)
/** Default autoVacuum to true (PocketBase bool zero-default is false) */
onRecordCreate((e) => {
  require(`${__hooks}/mothership`).BeforeCreate_autoVacuum(e)
  e.next()
}, 'instances')

/** New instances must use a selectable (0.23+) version */
onRecordCreate((e) => {
  require(`${__hooks}/mothership`).BeforeCreate_version(e)
  e.next()
}, 'instances')

/** Validate instance version */
onRecordUpdate((e) => {
  require(`${__hooks}/mothership`).BeforeUpdate_version(e)
  e.next()
}, 'instances')

/** Validate cname */
onRecordUpdate((e) => {
  require(`${__hooks}/mothership`).BeforeUpdate_cname(e)
  e.next()
}, 'instances')

/** Notify discord on instance create */
// onRecordAfterCreateSuccess((e) => {
//   e.next()
//   return require(`${__hooks}/mothership`).AfterCreate_notify_discord(e)
// }, 'instances')

onBootstrap((e) => {
  e.next()
  // return require(`${__hooks}/mothership`).HandleMigrateInstanceVersions(e)
})

/** Reset instance status to idle on start */
onBootstrap((e) => {
  e.next()
  return require(`${__hooks}/mothership`).HandleInstancesResetIdle(e)
})
