/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("s00x84jumfjcuvc")

  // remove
  collection.schema.removeField("zxevivcb")

  // remove
  collection.schema.removeField("mnrvzbur")

  // remove
  collection.schema.removeField("vbsbhwar")

  // remove
  collection.schema.removeField("juoocwz5")

  // remove
  collection.schema.removeField("kjvjizen")

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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("s00x84jumfjcuvc")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zxevivcb",
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
    "id": "mnrvzbur",
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
    "id": "vbsbhwar",
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
    "id": "juoocwz5",
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
    "id": "kjvjizen",
    "name": "isFounder",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

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

  return dao.saveCollection(collection)
})
