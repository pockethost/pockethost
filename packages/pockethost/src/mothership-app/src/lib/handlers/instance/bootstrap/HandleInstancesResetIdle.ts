export const HandleInstancesResetIdle = (e: core.BootstrapEvent) => {
  e.next()
  const dao = $app
  dao.db().newQuery(`update instances set status='idle'`).execute()
}
