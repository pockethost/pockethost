/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("buq519uv711078p")

  collection.options = {
    "query": "SELECT\n  (ROW_NUMBER() OVER()) as id,\n    (select value from settings where name='founders-edition-count') as founder_slots_remaining, \n    COUNT(DISTINCT users.id) AS total_users,\n    COUNT(DISTINCT CASE WHEN users.subscription ='legacy' THEN users.id END) AS total_legacy_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription ='free' THEN users.id END) AS total_free_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' THEN users.id END) AS total_pro_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'lifetime' THEN users.id END) AS total_lifetime_subscribers,\n  \n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-1 hour') THEN users.id END) AS new_users_last_hour,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-24 hours') THEN users.id END) AS new_users_last_24_hours,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-7 days') THEN users.id END) AS new_users_last_7_days,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-30 days') THEN users.id END) AS new_users_last_30_days,\n  \n    COUNT(DISTINCT instances.id ) AS total_instances,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-1 hour') THEN instances.id END) AS total_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-24 hours') THEN instances.id END) AS total_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-7 days') THEN instances.id END) AS total_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-30 days') THEN instances.id END) AS total_instances_last_30_days,\n  \n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-1 hour') THEN instances.id END) AS new_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-24 hours') THEN instances.id END) AS new_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-7 days') THEN instances.id END) AS new_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-30 days') THEN instances.id END) AS new_instances_last_30_days\n  \nFROM\n    verified_users users\nLEFT JOIN\n    instances ON users.id = instances.uid;\n"
  }

  // remove
  collection.schema.removeField("xbiqigok")

  // remove
  collection.schema.removeField("fosqlcua")

  // remove
  collection.schema.removeField("ftqc6spe")

  // remove
  collection.schema.removeField("ydugkynl")

  // remove
  collection.schema.removeField("mmymwfrd")

  // remove
  collection.schema.removeField("ywa8rx3o")

  // remove
  collection.schema.removeField("t2iznzwl")

  // remove
  collection.schema.removeField("fxerbgja")

  // remove
  collection.schema.removeField("swxvleu2")

  // remove
  collection.schema.removeField("eyna5hix")

  // remove
  collection.schema.removeField("evyuzkc1")

  // remove
  collection.schema.removeField("uvs67m8a")

  // remove
  collection.schema.removeField("0w4bl6a6")

  // remove
  collection.schema.removeField("mjdkfffa")

  // remove
  collection.schema.removeField("q5u6pftm")

  // remove
  collection.schema.removeField("t1gswvzg")

  // remove
  collection.schema.removeField("lcfg6e5e")

  // remove
  collection.schema.removeField("w01k2s4v")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hy7njiza",
    "name": "founder_slots_remaining",
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
    "id": "qpbvc5ut",
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
    "id": "qlnytqmj",
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
    "id": "zbaplkwv",
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
    "id": "exu5uwpy",
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
    "id": "btak3el2",
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
    "id": "enur9h6p",
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
    "id": "zypx3s5g",
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
    "id": "8o6qwwpk",
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
    "id": "owppxkp1",
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
    "id": "t5hfbuy0",
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
    "id": "hy6ksvwr",
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
    "id": "esvqpfks",
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
    "id": "yl9gsbnh",
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
    "id": "fob5xhbs",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "upjeewnx",
    "name": "new_instances_last_hour",
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
    "id": "2quxsopb",
    "name": "new_instances_last_24_hours",
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
    "id": "9u8mi3xv",
    "name": "new_instances_last_7_days",
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
    "id": "crqnqirt",
    "name": "new_instances_last_30_days",
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
    "query": "SELECT\n  (ROW_NUMBER() OVER()) as id,\n  \n    COUNT(DISTINCT users.id) AS total_users,\n    COUNT(DISTINCT CASE WHEN users.subscription ='legacy' THEN users.id END) AS total_legacy_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription ='free' THEN users.id END) AS total_free_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' THEN users.id END) AS total_pro_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'lifetime' THEN users.id END) AS total_lifetime_subscribers,\n  \n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-1 hour') THEN users.id END) AS new_users_last_hour,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-24 hours') THEN users.id END) AS new_users_last_24_hours,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-7 days') THEN users.id END) AS new_users_last_7_days,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-30 days') THEN users.id END) AS new_users_last_30_days,\n  \n    COUNT(DISTINCT instances.id ) AS total_instances,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-1 hour') THEN instances.id END) AS total_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-24 hours') THEN instances.id END) AS total_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-7 days') THEN instances.id END) AS total_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-30 days') THEN instances.id END) AS total_instances_last_30_days,\n  \n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-1 hour') THEN instances.id END) AS new_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-24 hours') THEN instances.id END) AS new_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-7 days') THEN instances.id END) AS new_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-30 days') THEN instances.id END) AS new_instances_last_30_days\n  \nFROM\n    verified_users users\nLEFT JOIN\n    instances ON users.id = instances.uid;\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xbiqigok",
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
    "id": "fosqlcua",
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
    "id": "ftqc6spe",
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
    "id": "ydugkynl",
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
    "id": "mmymwfrd",
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
    "id": "ywa8rx3o",
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
    "id": "t2iznzwl",
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
    "id": "fxerbgja",
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
    "id": "swxvleu2",
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
    "id": "eyna5hix",
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
    "id": "evyuzkc1",
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
    "id": "uvs67m8a",
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
    "id": "0w4bl6a6",
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
    "id": "mjdkfffa",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "q5u6pftm",
    "name": "new_instances_last_hour",
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
    "id": "t1gswvzg",
    "name": "new_instances_last_24_hours",
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
    "id": "lcfg6e5e",
    "name": "new_instances_last_7_days",
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
    "id": "w01k2s4v",
    "name": "new_instances_last_30_days",
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
  collection.schema.removeField("hy7njiza")

  // remove
  collection.schema.removeField("qpbvc5ut")

  // remove
  collection.schema.removeField("qlnytqmj")

  // remove
  collection.schema.removeField("zbaplkwv")

  // remove
  collection.schema.removeField("exu5uwpy")

  // remove
  collection.schema.removeField("btak3el2")

  // remove
  collection.schema.removeField("enur9h6p")

  // remove
  collection.schema.removeField("zypx3s5g")

  // remove
  collection.schema.removeField("8o6qwwpk")

  // remove
  collection.schema.removeField("owppxkp1")

  // remove
  collection.schema.removeField("t5hfbuy0")

  // remove
  collection.schema.removeField("hy6ksvwr")

  // remove
  collection.schema.removeField("esvqpfks")

  // remove
  collection.schema.removeField("yl9gsbnh")

  // remove
  collection.schema.removeField("fob5xhbs")

  // remove
  collection.schema.removeField("upjeewnx")

  // remove
  collection.schema.removeField("2quxsopb")

  // remove
  collection.schema.removeField("9u8mi3xv")

  // remove
  collection.schema.removeField("crqnqirt")

  return dao.saveCollection(collection)
})
