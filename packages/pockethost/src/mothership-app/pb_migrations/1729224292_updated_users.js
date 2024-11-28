/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("systemprofiles0")

  // remove
  collection.schema.removeField("c1lrvx9q")

  // remove
  collection.schema.removeField("wp3zam39")

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("systemprofiles0")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "c1lrvx9q",
    "name": "isLegacy",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wp3zam39",
    "name": "isFounder",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
})
