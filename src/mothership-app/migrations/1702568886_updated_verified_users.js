/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4kshuv7r3jdrst4")

  collection.options = {
    "query": "select id, username, email, subscription, isLegacy, isFounder,created,updated from users where verified = 1"
  }

  // remove
  collection.schema.removeField("ztrckqeh")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tnm1y7ix",
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
    "id": "auwz1pdd",
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
    "id": "ub6x7vng",
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
        "legacy"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "knixwubq",
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
    "id": "lwaiqdo7",
    "name": "isFounder",
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
    "query": "select id, email,created,updated from users where verified = 1"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ztrckqeh",
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

  // remove
  collection.schema.removeField("tnm1y7ix")

  // remove
  collection.schema.removeField("auwz1pdd")

  // remove
  collection.schema.removeField("ub6x7vng")

  // remove
  collection.schema.removeField("knixwubq")

  // remove
  collection.schema.removeField("lwaiqdo7")

  return dao.saveCollection(collection)
})
