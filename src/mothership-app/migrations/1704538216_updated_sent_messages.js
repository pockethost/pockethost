/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("18rfmj8aklx6bjq")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "kigwtdjb",
    "name": "campaign_message",
    "type": "relation",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "w1vjr1edr5tsam3",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("18rfmj8aklx6bjq")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "kigwtdjb",
    "name": "campaign",
    "type": "relation",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "w1vjr1edr5tsam3",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  return dao.saveCollection(collection)
})
