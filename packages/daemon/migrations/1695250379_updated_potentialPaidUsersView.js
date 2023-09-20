/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y7qb3zm8vslkfxj")

  collection.options = {
    "query": "SELECT u.id,\n       u.email,\n       i.secondsthismonth\nFROM   users u\nJOIN   instances i\nwhere  u.id=i.uid\nAND    i.secondsthismonth/60>200"
  }

  // remove
  collection.schema.removeField("9xsegduz")

  // remove
  collection.schema.removeField("4dmlmvan")

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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y7qb3zm8vslkfxj")

  collection.options = {
    "query": "SELECT u.id,\n       email,\n       i.secondsthismonth\nFROM   users u\nJOIN   instances i\nwhere  u.id=i.uid\nAND    secondsthismonth/60>200"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "9xsegduz",
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
    "id": "4dmlmvan",
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
  collection.schema.removeField("omarcdxd")

  // remove
  collection.schema.removeField("c2czszfp")

  return dao.saveCollection(collection)
})
