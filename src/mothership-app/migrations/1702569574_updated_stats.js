/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("buq519uv711078p")

  collection.options = {
    "query": "SELECT\n  (ROW_NUMBER() OVER()) as id,\n  \n    COUNT(DISTINCT users.id) AS total_users,\n    COUNT(DISTINCT CASE WHEN users.subscription ='legacy' THEN users.id END) AS total_legacy_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription ='free' THEN users.id END) AS total_free_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' THEN users.id END) AS total_pro_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'lifetime' THEN users.id END) AS total_lifetime_subscribers,\n  \n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-1 hour') THEN users.id END) AS new_users_last_hour,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-24 hours') THEN users.id END) AS new_users_last_24_hours,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-7 days') THEN users.id END) AS new_users_last_7_days,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-30 days') THEN users.id END) AS new_users_last_30_days,\n  \n    COUNT(DISTINCT instances.id ) AS total_instances,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-1 hour') THEN instances.id END) AS total_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-24 hours') THEN instances.id END) AS total_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-7 days') THEN instances.id END) AS total_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-30 days') THEN instances.id END) AS total_instances_last_30_days,\n  \n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-1 hour') THEN instances.id END) AS new_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-24 hours') THEN instances.id END) AS new_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-7 days') THEN instances.id END) AS new_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-30 days') THEN instances.id END) AS new_instances_last_30_days\n  \nFROM\n    verified_users users\nLEFT JOIN\n    instances ON users.id = instances.uid;\n"
  }

  // remove
  collection.schema.removeField("gskg4kqa")

  // remove
  collection.schema.removeField("9b4pgxlv")

  // remove
  collection.schema.removeField("kgf9xbui")

  // remove
  collection.schema.removeField("2l3ym1mw")

  // remove
  collection.schema.removeField("bxhkaly6")

  // remove
  collection.schema.removeField("bmhsumvr")

  // remove
  collection.schema.removeField("jjlza3cn")

  // remove
  collection.schema.removeField("m51jsrba")

  // remove
  collection.schema.removeField("5jk6cpd0")

  // remove
  collection.schema.removeField("8fgyvqai")

  // remove
  collection.schema.removeField("ewoabx5r")

  // remove
  collection.schema.removeField("yjpzeew4")

  // remove
  collection.schema.removeField("l6d6mc8b")

  // remove
  collection.schema.removeField("i0pa9otz")

  // remove
  collection.schema.removeField("zgjkjocr")

  // remove
  collection.schema.removeField("vofl09ck")

  // remove
  collection.schema.removeField("aww4v82e")

  // remove
  collection.schema.removeField("pnko7ffx")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ocbcyask",
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
    "id": "q5okyyvj",
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
    "id": "a8mv3hbg",
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
    "id": "bkn9fxd9",
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
    "id": "qkyv0nvm",
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
    "id": "g6hgzcbi",
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
    "id": "6e2gep5p",
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
    "id": "qdd2lgrg",
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
    "id": "mdsqys16",
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
    "id": "lz1oyvrc",
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
    "id": "ntg2cv49",
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
    "id": "o5o8e0a3",
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
    "id": "bi4hgf4i",
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
    "id": "e65bogl0",
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
    "id": "uxq8augl",
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
    "id": "w4k4qocm",
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
    "id": "vpbfbm1f",
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
    "id": "xactzvom",
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
    "query": "SELECT\n  (ROW_NUMBER() OVER()) as id,\n    COUNT(DISTINCT users.id) AS total_users,\n    COUNT(DISTINCT CASE WHEN users.subscription ='legacy' THEN users.id END) AS total_legacy_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription ='free' THEN users.id END) AS total_free_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' THEN users.id END) AS total_pro_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'lifetime' THEN users.id END) AS total_lifetime_subscribers,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-1 hour') THEN users.id END) AS new_users_last_hour,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-24 hours') THEN users.id END) AS new_users_last_24_hours,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-7 days') THEN users.id END) AS new_users_last_7_days,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-30 days') THEN users.id END) AS new_users_last_30_days,\n    COUNT(DISTINCT instances.id ) AS total_instances,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-1 hour') THEN instances.id END) AS total_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-24 hours') THEN instances.id END) AS total_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-7 days') THEN instances.id END) AS total_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-30 days') THEN instances.id END) AS total_instances_last_30_days,\n  \n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-1 hour') THEN instances.id END) AS new_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-24 hours') THEN instances.id END) AS new_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-7 days') THEN instances.id END) AS new_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-30 days') THEN instances.id END) AS new_instances_last_30_days\n  \nFROM\n    verified_users users\nLEFT JOIN\n    instances ON users.id = instances.uid;\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gskg4kqa",
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
    "id": "9b4pgxlv",
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
    "id": "kgf9xbui",
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
    "id": "2l3ym1mw",
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
    "id": "bxhkaly6",
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
    "id": "bmhsumvr",
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
    "id": "jjlza3cn",
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
    "id": "m51jsrba",
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
    "id": "5jk6cpd0",
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
    "id": "8fgyvqai",
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
    "id": "ewoabx5r",
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
    "id": "yjpzeew4",
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
    "id": "l6d6mc8b",
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
    "id": "i0pa9otz",
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
    "id": "zgjkjocr",
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
    "id": "vofl09ck",
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
    "id": "aww4v82e",
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
    "id": "pnko7ffx",
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
  collection.schema.removeField("ocbcyask")

  // remove
  collection.schema.removeField("q5okyyvj")

  // remove
  collection.schema.removeField("a8mv3hbg")

  // remove
  collection.schema.removeField("bkn9fxd9")

  // remove
  collection.schema.removeField("qkyv0nvm")

  // remove
  collection.schema.removeField("g6hgzcbi")

  // remove
  collection.schema.removeField("6e2gep5p")

  // remove
  collection.schema.removeField("qdd2lgrg")

  // remove
  collection.schema.removeField("mdsqys16")

  // remove
  collection.schema.removeField("lz1oyvrc")

  // remove
  collection.schema.removeField("ntg2cv49")

  // remove
  collection.schema.removeField("o5o8e0a3")

  // remove
  collection.schema.removeField("bi4hgf4i")

  // remove
  collection.schema.removeField("e65bogl0")

  // remove
  collection.schema.removeField("uxq8augl")

  // remove
  collection.schema.removeField("w4k4qocm")

  // remove
  collection.schema.removeField("vpbfbm1f")

  // remove
  collection.schema.removeField("xactzvom")

  return dao.saveCollection(collection)
})
