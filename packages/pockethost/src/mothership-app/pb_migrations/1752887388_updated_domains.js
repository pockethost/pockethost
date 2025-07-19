/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("jw1wz9nmkvnhcm6")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wn3oncif",
    "name": "domain",
    "type": "text",
    "required": false,
    "presentable": true,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("jw1wz9nmkvnhcm6")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wn3oncif",
    "name": "domain",
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
