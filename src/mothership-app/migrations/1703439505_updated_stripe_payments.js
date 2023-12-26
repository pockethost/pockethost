/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("iff2jfzb89dwiov")

  collection.indexes = [
    "CREATE INDEX `idx_DezkBvw` ON `stripe_payments` (`user`)",
    "CREATE INDEX `idx_A5j325f` ON `stripe_payments` (`stripe_payment_id`)",
    "CREATE INDEX `idx_qBPC3VW` ON `stripe_payments` (`created`)",
    "CREATE UNIQUE INDEX `idx_NPkwSnu` ON `stripe_payments` (`stripe_payment_id`)"
  ]

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("iff2jfzb89dwiov")

  collection.indexes = [
    "CREATE INDEX `idx_DezkBvw` ON `stripe_payments` (`user`)",
    "CREATE INDEX `idx_A5j325f` ON `stripe_payments` (`stripe_payment_id`)",
    "CREATE INDEX `idx_qBPC3VW` ON `stripe_payments` (`created`)"
  ]

  return dao.saveCollection(collection)
})
