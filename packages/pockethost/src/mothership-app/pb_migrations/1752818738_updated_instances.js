/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("etae8tuiaxl6xfv")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "p7f4wlm5",
    "name": "region",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "sfo-1",
        "sfo-2",
        "fra-1"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("etae8tuiaxl6xfv")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "p7f4wlm5",
    "name": "region",
    "type": "select",
    "required": false,
    "presentable": true,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "sfo-1",
        "sfo-2",
        "fra-1"
      ]
    }
  }))

  return dao.saveCollection(collection)
})
