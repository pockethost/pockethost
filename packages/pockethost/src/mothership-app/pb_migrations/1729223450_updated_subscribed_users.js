/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("s00x84jumfjcuvc")

  collection.options = {
    "query": "select id, username, email, subscription, subscription_interval ,created,updated from verified_users where unsubscribe=0"
  }

  // remove
  collection.schema.removeField("nxgkeook")

  // remove
  collection.schema.removeField("aegnhgqh")

  // remove
  collection.schema.removeField("cm0hyyx3")

  // remove
  collection.schema.removeField("smjrftnt")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nxduzx8j",
    "name": "username",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "uxypjefe",
    "name": "email",
    "type": "email",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "exceptDomains": null,
      "onlyDomains": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "2eksisrf",
    "name": "subscription",
    "type": "select",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "free",
        "premium",
        "lifetime",
        "founder",
        "legacy"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "9vsfyoqa",
    "name": "subscription_interval",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "month",
        "year",
        "life"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("s00x84jumfjcuvc")

  collection.options = {
    "query": "select id, username, email, subscription, subscription_interval, created,updated from verified_users where unsubscribe=0"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nxgkeook",
    "name": "username",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "aegnhgqh",
    "name": "email",
    "type": "email",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "exceptDomains": null,
      "onlyDomains": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "cm0hyyx3",
    "name": "subscription",
    "type": "select",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "free",
        "premium",
        "lifetime",
        "founder",
        "legacy"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "smjrftnt",
    "name": "subscription_interval",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "month",
        "year",
        "life"
      ]
    }
  }))

  // remove
  collection.schema.removeField("nxduzx8j")

  // remove
  collection.schema.removeField("uxypjefe")

  // remove
  collection.schema.removeField("2eksisrf")

  // remove
  collection.schema.removeField("9vsfyoqa")

  return dao.saveCollection(collection)
})
