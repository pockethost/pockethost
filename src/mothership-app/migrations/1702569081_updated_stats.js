/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("buq519uv711078p")

  collection.options = {
    "query": "SELECT\n  (ROW_NUMBER() OVER()) as id,\n    COUNT(DISTINCT users.id) AS total_users,\n    COUNT(DISTINCT CASE WHEN users.subscription ='legacy' THEN users.id END) AS total_legacy_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription ='free' THEN users.id END) AS total_free_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' THEN users.id END) AS total_pro_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'lifetime' THEN users.id END) AS total_lifetime_subscribers,\n    COUNT(DISTINCT instances.id ) AS instances,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-1 hour') THEN instances.id END) AS instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-24 hours') THEN instances.id END) AS instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-7 days') THEN instances.id END) AS instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-30 days') THEN instances.id END) AS instances_last_30_days\nFROM\n    verified_users users\nLEFT JOIN\n    instances ON users.id = instances.uid;\n"
  }

  // remove
  collection.schema.removeField("gbusypds")

  // remove
  collection.schema.removeField("enlkpkjb")

  // remove
  collection.schema.removeField("uouawo7o")

  // remove
  collection.schema.removeField("rb1wzsv7")

  // remove
  collection.schema.removeField("whdajjy5")

  // remove
  collection.schema.removeField("xwxkyd41")

  // remove
  collection.schema.removeField("uyczm2an")

  // remove
  collection.schema.removeField("jsgangu8")

  // remove
  collection.schema.removeField("0dalcs71")

  // remove
  collection.schema.removeField("jzzbzyxy")

  // remove
  collection.schema.removeField("zj0otefi")

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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("buq519uv711078p")

  collection.options = {
    "query": "SELECT\n  (ROW_NUMBER() OVER()) as id,\n    COUNT(DISTINCT users.id) AS total_users,\n    COUNT(DISTINCT CASE WHEN users.verified = 1 THEN users.id END) AS total_verified_users,\n    COUNT(DISTINCT CASE WHEN users.subscription ='legacy' THEN users.id END) AS total_legacy_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription ='free' THEN users.id END) AS total_free_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' THEN users.id END) AS total_pro_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'lifetime' THEN users.id END) AS total_lifetime_subscribers,\n    COUNT(DISTINCT CASE WHEN users.verified = 1 THEN instances.id END) AS verified_instances,\n    COUNT(DISTINCT CASE WHEN users.verified = 1 AND instances.updated > DATETIME('now', '-1 hour') THEN instances.id END) AS verified_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN users.verified = 1 AND instances.updated > DATETIME('now', '-24 hours') THEN instances.id END) AS verified_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN users.verified = 1 AND instances.updated > DATETIME('now', '-7 days') THEN instances.id END) AS verified_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN users.verified = 1 AND instances.updated > DATETIME('now', '-30 days') THEN instances.id END) AS verified_instances_last_30_days\nFROM\n    users\nLEFT JOIN\n    instances ON users.id = instances.uid;\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gbusypds",
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
    "id": "enlkpkjb",
    "name": "total_verified_users",
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
    "id": "uouawo7o",
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
    "id": "rb1wzsv7",
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
    "id": "whdajjy5",
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
    "id": "xwxkyd41",
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
    "id": "uyczm2an",
    "name": "verified_instances",
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
    "id": "jsgangu8",
    "name": "verified_instances_last_hour",
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
    "id": "0dalcs71",
    "name": "verified_instances_last_24_hours",
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
    "id": "jzzbzyxy",
    "name": "verified_instances_last_7_days",
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
    "id": "zj0otefi",
    "name": "verified_instances_last_30_days",
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

  return dao.saveCollection(collection)
})
