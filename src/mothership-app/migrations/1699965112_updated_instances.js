/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("etae8tuiaxl6xfv")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hkt4q8yk",
    "name": "syncAdmin",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("etae8tuiaxl6xfv")

  // remove
  collection.schema.removeField("hkt4q8yk")

  return dao.saveCollection(collection)
})
