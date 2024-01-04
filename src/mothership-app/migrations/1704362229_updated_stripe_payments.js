/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("iff2jfzb89dwiov")

  collection.name = "payments"
  collection.indexes = [
    "CREATE INDEX `idx_DezkBvw` ON `payments` (`user`)",
    "CREATE INDEX `idx_A5j325f` ON `payments` (`payment_id`)",
    "CREATE INDEX `idx_qBPC3VW` ON `payments` (`created`)",
    "CREATE UNIQUE INDEX `idx_NPkwSnu` ON `payments` (`payment_id`)"
  ]

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tgaer8rx",
    "name": "payment_id",
    "type": "text",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("iff2jfzb89dwiov")

  collection.name = "stripe_payments"
  collection.indexes = [
    "CREATE INDEX `idx_DezkBvw` ON `stripe_payments` (`user`)",
    "CREATE INDEX `idx_A5j325f` ON `stripe_payments` (`stripe_payment_id`)",
    "CREATE INDEX `idx_qBPC3VW` ON `stripe_payments` (`created`)",
    "CREATE UNIQUE INDEX `idx_NPkwSnu` ON `stripe_payments` (`stripe_payment_id`)"
  ]

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tgaer8rx",
    "name": "stripe_payment_id",
    "type": "text",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
})
