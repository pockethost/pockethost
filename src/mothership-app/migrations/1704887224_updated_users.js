/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("systemprofiles0")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "umykxmck",
    "name": "welcome",
    "type": "date",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": "",
      "max": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("systemprofiles0")

  // remove
  collection.schema.removeField("umykxmck")

  return dao.saveCollection(collection)
})
