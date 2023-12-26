/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7vzz1jr2us7mwmx")

  collection.options = {
    "query": "SELECT \n   (ROW_NUMBER() OVER()) as id,\n    strftime('%Y-%m', created) AS t, \n    COUNT(*) AS c \nFROM \n    users \nGROUP BY \n    t\n\torder by t desc\n"
  }

  // remove
  collection.schema.removeField("6w2uyzd9")

  // remove
  collection.schema.removeField("ytpf0f1l")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ee4obryu",
    "name": "t",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "kq8xt1mi",
    "name": "c",
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
  const collection = dao.findCollectionByNameOrId("7vzz1jr2us7mwmx")

  collection.options = {
    "query": "SELECT \n   (ROW_NUMBER() OVER()) as id,\n    strftime('%Y-%m', created) AS t, \n    COUNT(*) AS c \nFROM \n    users \nGROUP BY \n    t\n\torder by t asc\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "6w2uyzd9",
    "name": "t",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ytpf0f1l",
    "name": "c",
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
  collection.schema.removeField("ee4obryu")

  // remove
  collection.schema.removeField("kq8xt1mi")

  return dao.saveCollection(collection)
})
