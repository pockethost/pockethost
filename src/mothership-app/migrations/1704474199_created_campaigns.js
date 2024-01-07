/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "yfhnigik0uvyt4m",
    "created": "2024-01-05 08:50:50.016Z",
    "updated": "2024-01-05 17:03:19.348Z",
    "name": "campaigns",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "1laswhyx",
        "name": "name",
        "type": "text",
        "required": true,
        "presentable": true,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "4fxgwtui",
        "name": "vars",
        "type": "json",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 20000
        }
      },
      {
        "system": false,
        "id": "tni65iyd",
        "name": "usersQuery",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("yfhnigik0uvyt4m");

  return dao.deleteCollection(collection);
})
