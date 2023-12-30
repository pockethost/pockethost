/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7n6rny9w7n52mvi")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "yvy0exvk",
    "name": "instance",
    "type": "relation",
    "required": false,
    "presentable": true,
    "unique": false,
    "options": {
      "collectionId": "etae8tuiaxl6xfv",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7n6rny9w7n52mvi")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "yvy0exvk",
    "name": "instance",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "etae8tuiaxl6xfv",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  return dao.saveCollection(collection)
})
