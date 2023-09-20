/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y7qb3zm8vslkfxj")

  collection.options = {
    "query": "select u.id,email,secondsThisMonth from users u join instances i where u.id=i.uid and secondsThisMonth/60>200"
  }

  // remove
  collection.schema.removeField("4nas99bt")

  // remove
  collection.schema.removeField("pmfykpks")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "c0fjqkvh",
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
    "id": "nrzmfvrb",
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
    "query": "select u.id,email,secondsThisMonth from users u join instances i where u.id=i.uid and secondsThisMonth/60>500"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "4nas99bt",
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
    "id": "pmfykpks",
    "name": "secondsThisMonth",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("c0fjqkvh")

  // remove
  collection.schema.removeField("nrzmfvrb")

  return dao.saveCollection(collection)
})
