/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("s00x84jumfjcuvc")

  collection.options = {
    "query": "select id, username, email, subscription, subscription_interval, created,updated from verified_users where unsubscribe=0"
  }

  // remove
  collection.schema.removeField("1l3mn4p5")

  // remove
  collection.schema.removeField("8uo8rsrr")

  // remove
  collection.schema.removeField("54tyrksg")

  // remove
  collection.schema.removeField("9bvqwzmu")

  // remove
  collection.schema.removeField("5ftrlbfn")

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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("s00x84jumfjcuvc")

  collection.options = {
    "query": "select id, username, email, subscription, isLegacy, isFounder,created,updated from users where verified=1 and unsubscribe=0"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1l3mn4p5",
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
    "id": "8uo8rsrr",
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
    "id": "54tyrksg",
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
    "id": "9bvqwzmu",
    "name": "isLegacy",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "5ftrlbfn",
    "name": "isFounder",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("nxgkeook")

  // remove
  collection.schema.removeField("aegnhgqh")

  // remove
  collection.schema.removeField("cm0hyyx3")

  // remove
  collection.schema.removeField("smjrftnt")

  return dao.saveCollection(collection)
})
