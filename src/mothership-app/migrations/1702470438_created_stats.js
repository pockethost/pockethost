/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "buq519uv711078p",
    "created": "2023-12-13 12:27:18.834Z",
    "updated": "2023-12-13 12:27:18.834Z",
    "name": "stats",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "3yphuaaj",
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
      },
      {
        "system": false,
        "id": "38n3tegi",
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
      },
      {
        "system": false,
        "id": "8f9f6zdu",
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
      },
      {
        "system": false,
        "id": "zjwddaeq",
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
      },
      {
        "system": false,
        "id": "uuokjxef",
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
      },
      {
        "system": false,
        "id": "mnldzliz",
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
      },
      {
        "system": false,
        "id": "ckwdam5b",
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
      },
      {
        "system": false,
        "id": "ymm1aa7u",
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
      },
      {
        "system": false,
        "id": "mdn95zm0",
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
      },
      {
        "system": false,
        "id": "sg7l3nmm",
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
      },
      {
        "system": false,
        "id": "oi12fxeb",
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
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {
      "query": "SELECT\n  (ROW_NUMBER() OVER()) as id,\n    COUNT(DISTINCT users.id) AS total_users,\n    COUNT(DISTINCT CASE WHEN users.verified = 1 THEN users.id END) AS total_verified_users,\n    COUNT(DISTINCT CASE WHEN users.subscription ='legacy' THEN users.id END) AS total_legacy_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription ='free' THEN users.id END) AS total_free_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' THEN users.id END) AS total_pro_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'lifetime' THEN users.id END) AS total_lifetime_subscribers,\n    COUNT(DISTINCT CASE WHEN users.verified = 1 THEN instances.id END) AS verified_instances,\n    COUNT(DISTINCT CASE WHEN users.verified = 1 AND instances.updated > DATETIME('now', '-1 hour') THEN instances.id END) AS verified_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN users.verified = 1 AND instances.updated > DATETIME('now', '-24 hours') THEN instances.id END) AS verified_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN users.verified = 1 AND instances.updated > DATETIME('now', '-7 days') THEN instances.id END) AS verified_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN users.verified = 1 AND instances.updated > DATETIME('now', '-30 days') THEN instances.id END) AS verified_instances_last_30_days\nFROM\n    users\nLEFT JOIN\n    instances ON users.id = instances.uid;\n"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("buq519uv711078p");

  return dao.deleteCollection(collection);
})
