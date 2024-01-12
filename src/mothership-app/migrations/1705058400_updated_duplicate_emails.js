/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("h055gvw3oqi2fs0")

  collection.options = {
    "query": "SELECT \n  (ROW_NUMBER() OVER()) as id,\n    SUBSTR(email, 1, INSTR(email, '@') - 1) AS email_prefix,\n    SUBSTR(email, INSTR(email, '@')) AS email_domain,\n    COUNT(*) AS count\nFROM \n    (SELECT \n         CASE \n             WHEN INSTR(SUBSTR(email, 1, INSTR(email, '@') - 1), '+') > 0 \n             THEN SUBSTR(email, 1, INSTR(SUBSTR(email, 1, INSTR(email, '@') - 1), '+') - 1) || SUBSTR(email, INSTR(email, '@')) \n             ELSE email \n         END AS email \n     FROM users)\nGROUP BY \n    email_prefix, email_domain;\n"
  }

  // remove
  collection.schema.removeField("92iigwzl")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "y2akvv89",
    "name": "email_prefix",
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
    "id": "za7mr8gw",
    "name": "email_domain",
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
    "id": "zjwougcm",
    "name": "count",
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
  const collection = dao.findCollectionByNameOrId("h055gvw3oqi2fs0")

  collection.options = {
    "query": "SELECT (ROW_NUMBER() OVER()) as id, email\nFROM users\n  WHERE email LIKE '%+%'\n"
  }

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

  // remove
  collection.schema.removeField("y2akvv89")

  // remove
  collection.schema.removeField("za7mr8gw")

  // remove
  collection.schema.removeField("zjwougcm")

  return dao.saveCollection(collection)
})
