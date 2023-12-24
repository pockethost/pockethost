/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7vzz1jr2us7mwmx")

  collection.options = {
    "query": "SELECT \n   (ROW_NUMBER() OVER()) as id,\n    strftime('%Y-%m', created) AS t, \n    COUNT(*) AS c \nFROM \n    users \nGROUP BY \n    t\n\torder by t asc\n"
  }

  // remove
  collection.schema.removeField("q1td6nqz")

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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7vzz1jr2us7mwmx")

  collection.options = {
    "query": "SELECT \n   (ROW_NUMBER() OVER()) as id,\n    strftime('%Y-%m', created) AS created, \n    COUNT(*) AS total \nFROM \n    users \nGROUP BY \n    created\n\torder by created asc\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "q1td6nqz",
    "name": "total",
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
  collection.schema.removeField("6w2uyzd9")

  // remove
  collection.schema.removeField("ytpf0f1l")

  return dao.saveCollection(collection)
})
