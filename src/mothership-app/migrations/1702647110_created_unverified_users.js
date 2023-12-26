/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "ledwhu6imoityio",
    "created": "2023-12-15 13:31:50.847Z",
    "updated": "2023-12-15 13:31:50.847Z",
    "name": "unverified_users",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "a7hgqlhy",
        "name": "username",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "z4l0bepp",
        "name": "email",
        "type": "email",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "exceptDomains": null,
          "onlyDomains": null
        }
      },
      {
        "system": false,
        "id": "mbqp64a3",
        "name": "subscription",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "free",
            "premium",
            "lifetime",
            "legacy"
          ]
        }
      },
      {
        "system": false,
        "id": "1dcezcd0",
        "name": "isLegacy",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "enaepvse",
        "name": "isFounder",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {
      "query": "select id, username, email, subscription, isLegacy, isFounder,created,updated from users where verified = 0"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("ledwhu6imoityio");

  return dao.deleteCollection(collection);
})
