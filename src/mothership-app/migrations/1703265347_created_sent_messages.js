/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "18rfmj8aklx6bjq",
    "created": "2023-12-22 17:15:47.557Z",
    "updated": "2023-12-22 17:15:47.557Z",
    "name": "sent_messages",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "wuitrzp6",
        "name": "user",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "systemprofiles0",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "yzvlcy7m",
        "name": "message",
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
  const collection = dao.findCollectionByNameOrId("18rfmj8aklx6bjq");

  return dao.deleteCollection(collection);
})
