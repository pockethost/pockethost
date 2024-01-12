/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("h055gvw3oqi2fs0")

  collection.options = {
    "query": "SELECT (ROW_NUMBER() OVER()) as id, email\nFROM users\n  WHERE email LIKE '%+%'\n"
  }

  // remove
  collection.schema.removeField("juo93d3a")

  // remove
  collection.schema.removeField("whrph450")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "92iigwzl",
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
  const collection = dao.findCollectionByNameOrId("h055gvw3oqi2fs0")

  collection.options = {
    "query": "SELECT (ROW_NUMBER() OVER()) as id, SUBSTR(email, INSTR(email, '@')) AS domain, COUNT(*) AS user_count\nFROM users\n  WHERE email LIKE '%+%'\nORDER BY user_count DESC;\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "juo93d3a",
    "name": "domain",
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
    "id": "whrph450",
    "name": "user_count",
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
  collection.schema.removeField("92iigwzl")

  return dao.saveCollection(collection)
})
