const exportRecord = (record: models.Record) => record.publicExport()

export const buildMirrorDump = (dao: core.Dao) => {
  const users = dao
    .findRecordsByFilter(`users`, `verified = true`)
    .filter((r): r is models.Record => !!r)
    .map(exportRecord)

  const instances = dao
    .findRecordsByExpr(`instances`, $dbx.exp(`instances.uid in (select id from users where verified = 1)`))
    .filter((r): r is models.Record => !!r)
    .map(exportRecord)

  return { users, instances }
}
