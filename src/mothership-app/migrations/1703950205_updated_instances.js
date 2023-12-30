/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("etae8tuiaxl6xfv")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "k7nxxzdr",
    "name": "s3",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "7n6rny9w7n52mvi",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("etae8tuiaxl6xfv")

  // remove
  collection.schema.removeField("k7nxxzdr")

  return dao.saveCollection(collection)
})
