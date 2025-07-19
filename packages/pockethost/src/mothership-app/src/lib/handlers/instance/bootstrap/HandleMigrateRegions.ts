import { mkLog } from '$util/Logger'

/** Migrate version numbers */
export const HandleMigrateRegions = (e: core.BootstrapEvent) => {
  const dao = $app.dao()
  const log = mkLog(`HandleMigrateRegions`)
  log(`Migrating regions`)
  dao.db().newQuery(`update instances set region='sfo-1' where region=''`).execute()
  log(`Migrated regions`)
}
