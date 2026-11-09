const exportRecord = (record: models.Record) => record.publicExport()

/** Instances carry their edge for routing; `edge` is hidden from customers, so add it back explicitly. */
const exportInstance = (record: models.Record) => ({ ...record.publicExport(), edge: record.getString('edge') })

export const buildMirrorDump = (app: core.App) => {
  const users = app
    .findRecordsByFilter(`users`, `verified = true`)
    .filter((r): r is models.Record => !!r)
    .map(exportRecord)

  const instances = app
    .findAllRecords(`instances`, $dbx.exp(`instances.uid in (select id from users where verified = 1)`))
    .filter((r): r is models.Record => !!r)
    .map(exportInstance)

  const edges = app
    .findAllRecords(`edges`)
    .filter((r): r is models.Record => !!r)
    .map(exportRecord)

  return { users, instances, edges }
}
