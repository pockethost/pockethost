/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y5lqraz7c4jvisu")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "v8zn89fa",
    "name": "message_template",
    "type": "relation",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "6m8h2sy0nutig46",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y5lqraz7c4jvisu")

  // remove
  collection.schema.removeField("v8zn89fa")

  return dao.saveCollection(collection)
})
