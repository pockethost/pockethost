/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y5lqraz7c4jvisu")

  // remove
  collection.schema.removeField("as9ni2h6")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "sgeq9rbv",
    "name": "delivered",
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
  const collection = dao.findCollectionByNameOrId("y5lqraz7c4jvisu")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "as9ni2h6",
    "name": "delivered",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("sgeq9rbv")

  return dao.saveCollection(collection)
})
