/** Migrate version numbers */
onAfterBootstrap((e) => {
  const dao = $app.dao()

  console.log(`***Migrating regions`)
  const records = dao.findRecordsByFilter(`instances`, '1=1')
  records.forEach((record) => {
    record.set(`region`, `sfo-1`)
    dao.saveRecord(record)
  })
})
