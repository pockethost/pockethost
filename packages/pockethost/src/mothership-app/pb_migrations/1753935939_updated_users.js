/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("systemprofiles0")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "5jejgdlc",
    "name": "notes",
    "type": "editor",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "convertUrls": false
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("systemprofiles0")

  // remove
  collection.schema.removeField("5jejgdlc")

  return dao.saveCollection(collection)
})
