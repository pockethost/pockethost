/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4kshuv7r3jdrst4")

  collection.options = {
    "query": "select id, username, email, subscription, subscription_interval, isLegacy,  tokenKey, passwordHash, unsubscribe, created, updated from users where verified = 1"
  }

  // remove
  collection.schema.removeField("dgavdsye")

  // remove
  collection.schema.removeField("6ox4ryrt")

  // remove
  collection.schema.removeField("ltxh8knp")

  // remove
  collection.schema.removeField("g1bllptw")

  // remove
  collection.schema.removeField("0a55mfof")

  // remove
  collection.schema.removeField("zxfcqidt")

  // remove
  collection.schema.removeField("r5u0orvm")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "q69x8w4a",
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
    "id": "er2ylafm",
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
    "id": "vpmfcodf",
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
    "id": "anvzvrl7",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "185juzjg",
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
    "id": "ldm3npvb",
    "name": "tokenKey",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "5cjjcfgn",
    "name": "passwordHash",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "krgy04py",
    "name": "unsubscribe",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4kshuv7r3jdrst4")

  collection.options = {
    "query": "select id, username, email, subscription, subscription_interval, isLegacy,  tokenKey, passwordHash, created, updated from users where verified = 1"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "dgavdsye",
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
    "id": "6ox4ryrt",
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
    "id": "ltxh8knp",
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
    "id": "g1bllptw",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "0a55mfof",
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
    "id": "zxfcqidt",
    "name": "tokenKey",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "r5u0orvm",
    "name": "passwordHash",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // remove
  collection.schema.removeField("q69x8w4a")

  // remove
  collection.schema.removeField("er2ylafm")

  // remove
  collection.schema.removeField("vpmfcodf")

  // remove
  collection.schema.removeField("anvzvrl7")

  // remove
  collection.schema.removeField("185juzjg")

  // remove
  collection.schema.removeField("ldm3npvb")

  // remove
  collection.schema.removeField("5cjjcfgn")

  // remove
  collection.schema.removeField("krgy04py")

  return dao.saveCollection(collection)
})
