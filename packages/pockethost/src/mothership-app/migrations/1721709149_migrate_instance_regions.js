/// <reference path="../pb_hooks/types/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)

  const records = dao.findRecordsByFilter(`instances`, '1=1')
  records.forEach((record) => {
    record.set(`region`, `sfo-1`)
    dao.saveRecord(record)
  })

  
})
