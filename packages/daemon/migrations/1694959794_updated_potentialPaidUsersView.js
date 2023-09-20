/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y7qb3zm8vslkfxj")

  collection.options = {
    "query": "select u.id,email,secondsThisMonth from users u join instances i where u.id=i.uid and secondsThisMonth>6000"
  }

  // remove
  collection.schema.removeField("4dwqriso")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jeo2co2y",
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
    "id": "pcl2olai",
    "name": "secondsThisMonth",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y7qb3zm8vslkfxj")

  collection.options = {
    "query": "select id,email from users where id in (select uid from instances where secondsThisMonth>6000)"
  }

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

  // remove
  collection.schema.removeField("jeo2co2y")

  // remove
  collection.schema.removeField("pcl2olai")

  return dao.saveCollection(collection)
})
