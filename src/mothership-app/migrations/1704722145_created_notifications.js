/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "y5lqraz7c4jvisu",
    "created": "2024-01-08 13:55:45.485Z",
    "updated": "2024-01-08 13:55:45.485Z",
    "name": "notifications",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "ezyqswtg",
        "name": "payload",
        "type": "json",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 2000000
        }
      },
      {
        "system": false,
        "id": "as9ni2h6",
        "name": "delivered",
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
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("y5lqraz7c4jvisu");

  return dao.deleteCollection(collection);
})
