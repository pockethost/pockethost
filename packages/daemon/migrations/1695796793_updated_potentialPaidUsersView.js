/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y7qb3zm8vslkfxj")

  collection.options = {
    "query": "SELECT u.id,\n       u.email,\n       u.secondsthismonth\nFROM   users u\nWHERE  u.verified=1 and u.secondsthismonth/60>200"
  }

  // remove
  collection.schema.removeField("ld24cbna")

  // remove
  collection.schema.removeField("g3qvj4tl")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "mkmeisox",
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
    "id": "wqw6fejd",
    "name": "secondsthismonth",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y7qb3zm8vslkfxj")

  collection.options = {
    "query": "SELECT u.id,\n       u.email,\n       u.secondsthismonth\nFROM   users u\nWHERE    u.secondsthismonth/60>200"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ld24cbna",
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
    "id": "g3qvj4tl",
    "name": "secondsthismonth",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  // remove
  collection.schema.removeField("mkmeisox")

  // remove
  collection.schema.removeField("wqw6fejd")

  return dao.saveCollection(collection)
})
