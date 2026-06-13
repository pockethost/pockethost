export const resetInstancesIdle = (dao: core.Dao) => {
  const records = dao.findRecordsByFilter(`instances`, `status != 'idle'`).filter((r): r is models.Record => !!r)
  let reset = 0

  for (const record of records) {
    record.set(`status`, `idle`)
    dao.saveRecord(record)
    reset++
  }

  return reset
}
