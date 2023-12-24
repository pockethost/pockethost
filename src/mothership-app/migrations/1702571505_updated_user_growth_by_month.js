/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7vzz1jr2us7mwmx")

  collection.options = {
    "query": "SELECT \n   (ROW_NUMBER() OVER()) as id,\n    strftime('%Y-%m', created) AS created, \n    COUNT(*) AS total \nFROM \n    users \nGROUP BY \n    created\n\torder by created asc\n"
  }

  // remove
  collection.schema.removeField("r2f9pxks")

  // remove
  collection.schema.removeField("hfwcgpmi")

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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7vzz1jr2us7mwmx")

  collection.options = {
    "query": "SELECT \n   (ROW_NUMBER() OVER()) as id,\n    strftime('%Y-%m', created) AS created_month, \n    COUNT(*) AS number_of_users \nFROM \n    users \nGROUP BY \n    created_month\n\torder by created_month asc\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "r2f9pxks",
    "name": "created_month",
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
    "id": "hfwcgpmi",
    "name": "number_of_users",
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
  collection.schema.removeField("q1td6nqz")

  return dao.saveCollection(collection)
})
