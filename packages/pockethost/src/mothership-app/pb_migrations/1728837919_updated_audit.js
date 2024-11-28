/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("hsuwe2h3csch1yr")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "s1npfwfb",
    "name": "context",
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
  const collection = dao.findCollectionByNameOrId("hsuwe2h3csch1yr")

  // remove
  collection.schema.removeField("s1npfwfb")

  return dao.saveCollection(collection)
})
