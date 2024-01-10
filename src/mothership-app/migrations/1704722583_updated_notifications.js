/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y5lqraz7c4jvisu")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ry5pnrld",
    "name": "user",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "systemprofiles0",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fksunfv1",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gmqwgamf",
    "name": "campaign",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "yfhnigik0uvyt4m",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "crksfxsv",
    "name": "message",
    "type": "relation",
    "required": false,
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
  const collection = dao.findCollectionByNameOrId("y5lqraz7c4jvisu")

  // remove
  collection.schema.removeField("ry5pnrld")

  // remove
  collection.schema.removeField("fksunfv1")

  // remove
  collection.schema.removeField("gmqwgamf")

  // remove
  collection.schema.removeField("crksfxsv")

  return dao.saveCollection(collection)
})
