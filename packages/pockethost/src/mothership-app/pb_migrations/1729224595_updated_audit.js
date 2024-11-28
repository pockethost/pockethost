/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("hsuwe2h3csch1yr")

  // remove
  collection.schema.removeField("orqvyzje")

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("hsuwe2h3csch1yr")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "orqvyzje",
    "name": "email",
    "type": "text",
    "required": false,
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
