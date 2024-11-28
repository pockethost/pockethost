export const HandleInstancesResetIdle = (e: core.BootstrapEvent) => {
  const dao = $app.dao()
  dao.db().newQuery(`update instances set status='idle'`).execute()
}
