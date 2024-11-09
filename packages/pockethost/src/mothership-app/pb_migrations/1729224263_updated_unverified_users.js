/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ledwhu6imoityio")

  collection.options = {
    "query": "select id, email, created,updated from users where verified = 0"
  }

  // remove
  collection.schema.removeField("u3xw295j")

  // remove
  collection.schema.removeField("zmruwma6")

  // remove
  collection.schema.removeField("ltqqpcrf")

  // remove
  collection.schema.removeField("jsdivvyf")

  // remove
  collection.schema.removeField("pssisw8g")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ny9zdjtf",
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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ledwhu6imoityio")

  collection.options = {
    "query": "select id, username, email, subscription, isLegacy, isFounder,created,updated from users where verified = 0"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "u3xw295j",
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
    "id": "zmruwma6",
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
    "id": "ltqqpcrf",
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
    "id": "jsdivvyf",
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
    "id": "pssisw8g",
    "name": "isFounder",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("ny9zdjtf")

  return dao.saveCollection(collection)
})
