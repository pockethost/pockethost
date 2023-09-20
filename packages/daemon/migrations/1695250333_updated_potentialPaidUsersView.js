/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y7qb3zm8vslkfxj")

  collection.options = {
    "query": "SELECT u.id,\n       email,\n       i.secondsthismonth\nFROM   users u\nJOIN   instances i\nwhere  u.id=i.uid\nAND    secondsthismonth/60>200"
  }

  // remove
  collection.schema.removeField("c0fjqkvh")

  // remove
  collection.schema.removeField("nrzmfvrb")

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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("y7qb3zm8vslkfxj")

  collection.options = {
    "query": "select u.id,email,secondsThisMonth from users u join instances i where u.id=i.uid and secondsThisMonth/60>200"
  }

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

  // remove
  collection.schema.removeField("9xsegduz")

  // remove
  collection.schema.removeField("4dmlmvan")

  return dao.saveCollection(collection)
})
