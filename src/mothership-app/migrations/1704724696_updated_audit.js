/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("hsuwe2h3csch1yr")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "kcj9mpcm",
    "name": "notification",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "y5lqraz7c4jvisu",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "sterc0x6",
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
    "id": "rtfafgv0",
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
    "id": "vsobm1jq",
    "name": "campaign_message",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nztvxk7i",
    "name": "sent_message",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "18rfmj8aklx6bjq",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "9vjfnw4e",
    "name": "raw_payload",
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
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("hsuwe2h3csch1yr")

  // remove
  collection.schema.removeField("kcj9mpcm")

  // remove
  collection.schema.removeField("sterc0x6")

  // remove
  collection.schema.removeField("rtfafgv0")

  // remove
  collection.schema.removeField("vsobm1jq")

  // remove
  collection.schema.removeField("nztvxk7i")

  // remove
  collection.schema.removeField("9vjfnw4e")

  return dao.saveCollection(collection)
})
