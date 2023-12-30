/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("systemprofiles0")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "stcfuecz",
    "name": "unsubscribe",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("systemprofiles0")

  // remove
  collection.schema.removeField("stcfuecz")

  return dao.saveCollection(collection)
})
