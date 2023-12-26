/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("aif4h1j462iqopo")

  collection.indexes = [
    "CREATE INDEX `idx_qMbeGsg` ON `settings` (`name`)"
  ]

  // remove
  collection.schema.removeField("vuyscz1q")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "a0gyirdi",
    "name": "name",
    "type": "text",
    "required": true,
    "presentable": true,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xso1u0og",
    "name": "value",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 2000000
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("aif4h1j462iqopo")

  collection.indexes = []

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vuyscz1q",
    "name": "founders_edition_count",
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

  // remove
  collection.schema.removeField("a0gyirdi")

  // remove
  collection.schema.removeField("xso1u0og")

  return dao.saveCollection(collection)
})
