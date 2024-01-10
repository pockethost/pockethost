/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y5lqraz7c4jvisu")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "dwn9j8oo",
    "name": "channel",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "email",
        "lemonbot"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y5lqraz7c4jvisu")

  // remove
  collection.schema.removeField("dwn9j8oo")

  return dao.saveCollection(collection)
})
