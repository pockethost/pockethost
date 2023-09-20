/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y7qb3zm8vslkfxj")

  collection.options = {
    "query": "SELECT u.id,\n       u.email,\n       u.secondsthismonth\nFROM   users u\nWHERE    u.secondsthismonth/60>200"
  }

  // remove
  collection.schema.removeField("omarcdxd")

  // remove
  collection.schema.removeField("c2czszfp")

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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y7qb3zm8vslkfxj")

  collection.options = {
    "query": "SELECT u.id,\n       u.email,\n       i.secondsthismonth\nFROM   users u\nJOIN   instances i\nwhere  u.id=i.uid\nAND    i.secondsthismonth/60>200"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "omarcdxd",
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
    "id": "c2czszfp",
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
  collection.schema.removeField("ld24cbna")

  // remove
  collection.schema.removeField("g3qvj4tl")

  return dao.saveCollection(collection)
})
