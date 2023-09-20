/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("systemprofiles0")

  collection.indexes = [
    "CREATE INDEX `idx_5qCe15w` ON `users` (`secondsThisMonth`)"
  ]

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "4xchr8ic",
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
  collection.schema.removeField("4xchr8ic")

  return dao.saveCollection(collection)
})
