/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("etae8tuiaxl6xfv")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "qdtuuld1",
    "name": "subdomain",
    "type": "text",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": 50,
      "pattern": "^[a-z][a-z0-9-]{2,39}$"
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("etae8tuiaxl6xfv")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "qdtuuld1",
    "name": "subdomain",
    "type": "text",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": 50,
      "pattern": "^[a-z][\\-a-z]+$"
    }
  }))

  return dao.saveCollection(collection)
})
