/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("systemprofiles0")

  collection.indexes = [
    "CREATE INDEX `idx_q4Kji47` ON `users` (`secondsThisMonth`)"
  ]

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "qz4cjamg",
    "name": "secondsThisMonth",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("systemprofiles0")

  collection.indexes = []

  // remove
  collection.schema.removeField("qz4cjamg")

  return dao.saveCollection(collection)
})
