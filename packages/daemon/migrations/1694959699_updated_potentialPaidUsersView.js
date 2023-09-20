/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y7qb3zm8vslkfxj")

  collection.options = {
    "query": "select id,email from users where id in (select uid from instances where secondsThisMonth>6000)"
  }

  // remove
  collection.schema.removeField("mu8wxouc")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "4dwqriso",
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
  const collection = dao.findCollectionByNameOrId("y7qb3zm8vslkfxj")

  collection.options = {
    "query": "select id,email from users where id in (select uid from instances where secondsThisMonth<=6000)"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "mu8wxouc",
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
  collection.schema.removeField("4dwqriso")

  return dao.saveCollection(collection)
})
