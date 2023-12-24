/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("buq519uv711078p")

  collection.options = {
    "query": "SELECT\n  (ROW_NUMBER() OVER()) as id,\n    COUNT(DISTINCT users.id) AS total_users,\n    COUNT(DISTINCT CASE WHEN users.subscription ='legacy' THEN users.id END) AS total_legacy_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription ='free' THEN users.id END) AS total_free_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' THEN users.id END) AS total_pro_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'lifetime' THEN users.id END) AS total_lifetime_subscribers,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-1 hour') THEN users.id END) AS new_users_last_hour,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-24 hours') THEN users.id END) AS new_users_last_24_hours,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-7 days') THEN users.id END) AS new_users_last_7_days,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-30 days') THEN users.id END) AS new_users_last_30_days,\n\n    COUNT(DISTINCT instances.id ) AS total_instances,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-1 hour') THEN instances.id END) AS total_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-24 hours') THEN instances.id END) AS total_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-7 days') THEN instances.id END) AS total_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-30 days') THEN instances.id END) AS total_instances_last_30_days\nFROM\n    verified_users users\nLEFT JOIN\n    instances ON users.id = instances.uid;\n"
  }

  // remove
  collection.schema.removeField("gptgmwlu")

  // remove
  collection.schema.removeField("u6uelwdv")

  // remove
  collection.schema.removeField("aukds5ub")

  // remove
  collection.schema.removeField("8macz0ll")

  // remove
  collection.schema.removeField("61tap13r")

  // remove
  collection.schema.removeField("q5r9xzdu")

  // remove
  collection.schema.removeField("dtknpqjw")

  // remove
  collection.schema.removeField("afbuvawa")

  // remove
  collection.schema.removeField("clggyuqh")

  // remove
  collection.schema.removeField("q5tv92td")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "qxokezck",
    "name": "total_users",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nhnu96xj",
    "name": "total_legacy_subscribers",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1ily0n9p",
    "name": "total_free_subscribers",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8yxlysux",
    "name": "total_pro_subscribers",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "twfa4xdq",
    "name": "total_lifetime_subscribers",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "etzohhgx",
    "name": "new_users_last_hour",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xw6z5two",
    "name": "new_users_last_24_hours",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "3kvrm6bs",
    "name": "new_users_last_7_days",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "dv5s3tlf",
    "name": "new_users_last_30_days",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xi0zsmee",
    "name": "total_instances",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tjjqxoin",
    "name": "total_instances_last_hour",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xt3tiocm",
    "name": "total_instances_last_24_hours",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8eknw7mm",
    "name": "total_instances_last_7_days",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nrhmdzra",
    "name": "total_instances_last_30_days",
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
  const collection = dao.findCollectionByNameOrId("buq519uv711078p")

  collection.options = {
    "query": "SELECT\n  (ROW_NUMBER() OVER()) as id,\n    COUNT(DISTINCT users.id) AS total_users,\n    COUNT(DISTINCT CASE WHEN users.subscription ='legacy' THEN users.id END) AS total_legacy_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription ='free' THEN users.id END) AS total_free_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' THEN users.id END) AS total_pro_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'lifetime' THEN users.id END) AS total_lifetime_subscribers,\n    COUNT(DISTINCT instances.id ) AS instances,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-1 hour') THEN instances.id END) AS instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-24 hours') THEN instances.id END) AS instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-7 days') THEN instances.id END) AS instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-30 days') THEN instances.id END) AS instances_last_30_days\nFROM\n    verified_users users\nLEFT JOIN\n    instances ON users.id = instances.uid;\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gptgmwlu",
    "name": "total_users",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "u6uelwdv",
    "name": "total_legacy_subscribers",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "aukds5ub",
    "name": "total_free_subscribers",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8macz0ll",
    "name": "total_pro_subscribers",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "61tap13r",
    "name": "total_lifetime_subscribers",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "q5r9xzdu",
    "name": "instances",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "dtknpqjw",
    "name": "instances_last_hour",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "afbuvawa",
    "name": "instances_last_24_hours",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "clggyuqh",
    "name": "instances_last_7_days",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "q5tv92td",
    "name": "instances_last_30_days",
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
  collection.schema.removeField("qxokezck")

  // remove
  collection.schema.removeField("nhnu96xj")

  // remove
  collection.schema.removeField("1ily0n9p")

  // remove
  collection.schema.removeField("8yxlysux")

  // remove
  collection.schema.removeField("twfa4xdq")

  // remove
  collection.schema.removeField("etzohhgx")

  // remove
  collection.schema.removeField("xw6z5two")

  // remove
  collection.schema.removeField("3kvrm6bs")

  // remove
  collection.schema.removeField("dv5s3tlf")

  // remove
  collection.schema.removeField("xi0zsmee")

  // remove
  collection.schema.removeField("tjjqxoin")

  // remove
  collection.schema.removeField("xt3tiocm")

  // remove
  collection.schema.removeField("8eknw7mm")

  // remove
  collection.schema.removeField("nrhmdzra")

  return dao.saveCollection(collection)
})
