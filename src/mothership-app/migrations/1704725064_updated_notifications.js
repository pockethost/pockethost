/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y5lqraz7c4jvisu")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "cmkxbt9j",
    "name": "payment",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "iff2jfzb89dwiov",
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
  collection.schema.removeField("cmkxbt9j")

  return dao.saveCollection(collection)
})
