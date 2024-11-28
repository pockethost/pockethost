/** Migrate version numbers */
export const HandleMigrateRegions = (e: core.BootstrapEvent) => {
  const dao = $app.dao()

  console.log(`***Migrating regions`)
  dao
    .db()
    .newQuery(`update instances set region='sfo-1' where region=''`)
    .execute()
}
