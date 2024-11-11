/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4kshuv7r3jdrst4")

  // remove
  collection.schema.removeField("fec2cbfb")

  // remove
  collection.schema.removeField("tytnadtb")

  // remove
  collection.schema.removeField("juickogz")

  // remove
  collection.schema.removeField("e5tbaqub")

  // remove
  collection.schema.removeField("lzoyncmi")

  // remove
  collection.schema.removeField("p5hwwwd1")

  // remove
  collection.schema.removeField("mswqajfw")

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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4kshuv7r3jdrst4")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fec2cbfb",
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
    "id": "tytnadtb",
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
    "id": "juickogz",
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
    "id": "e5tbaqub",
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
    "id": "lzoyncmi",
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
    "id": "p5hwwwd1",
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
    "id": "mswqajfw",
    "name": "unsubscribe",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

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

  return dao.saveCollection(collection)
})
