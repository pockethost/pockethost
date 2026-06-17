const exportRecord = (record: models.Record) => record.publicExport()

export const buildMirrorDump = (app: core.App) => {
  const users = app
    .findRecordsByFilter(`users`, `verified = true`)
    .filter((r): r is models.Record => !!r)
    .map(exportRecord)

  const instances = app
    .findAllRecords(`instances`, $dbx.exp(`instances.uid in (select id from users where verified = 1)`))
    .filter((r): r is models.Record => !!r)
    .map(exportRecord)

  return { users, instances }
}
