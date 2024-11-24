/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4kshuv7r3jdrst4")

  collection.options = {
    "query": "select id, username, email, subscription, subscription_interval, tokenKey, passwordHash, unsubscribe, s3, created, updated from users where verified = 1"
  }

  // remove
  collection.schema.removeField("lgcb0lnr")

  // remove
  collection.schema.removeField("uis8woxw")

  // remove
  collection.schema.removeField("6dbuvkcr")

  // remove
  collection.schema.removeField("nrmbdf15")

  // remove
  collection.schema.removeField("bjws5smi")

  // remove
  collection.schema.removeField("dlh0pf9o")

  // remove
  collection.schema.removeField("baky64ne")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "3a7rml1j",
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
    "id": "bnl6ad4i",
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
    "id": "ksygfdso",
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
        "founder",
        "flounder",
        "legacy"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "n0umiou7",
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
    "id": "uejrddgg",
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
    "id": "bnpzoaia",
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
    "id": "9bbzqjjn",
    "name": "unsubscribe",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vsmepkpt",
    "name": "s3",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 2000000
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4kshuv7r3jdrst4")

  collection.options = {
    "query": "select id, username, email, subscription, subscription_interval, tokenKey, passwordHash, unsubscribe, created, updated from users where verified = 1"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "lgcb0lnr",
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
    "id": "uis8woxw",
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
    "id": "6dbuvkcr",
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
        "founder",
        "flounder",
        "legacy"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nrmbdf15",
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
    "id": "bjws5smi",
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
    "id": "dlh0pf9o",
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
    "id": "baky64ne",
    "name": "unsubscribe",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("3a7rml1j")

  // remove
  collection.schema.removeField("bnl6ad4i")

  // remove
  collection.schema.removeField("ksygfdso")

  // remove
  collection.schema.removeField("n0umiou7")

  // remove
  collection.schema.removeField("uejrddgg")

  // remove
  collection.schema.removeField("bnpzoaia")

  // remove
  collection.schema.removeField("9bbzqjjn")

  // remove
  collection.schema.removeField("vsmepkpt")

  return dao.saveCollection(collection)
})
