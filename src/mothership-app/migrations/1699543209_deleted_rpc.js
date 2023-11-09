/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("v7s41iokt1vizxd");

  return dao.deleteCollection(collection);
}, (db) => {
  const collection = new Collection({
    "id": "v7s41iokt1vizxd",
    "created": "2022-11-15 03:28:33.097Z",
    "updated": "2023-06-19 02:56:16.446Z",
    "name": "rpc",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "yv38czcf",
        "name": "userId",
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
        "id": "tgvaxwfv",
        "name": "payload",
        "type": "json",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "zede8pci",
        "name": "status",
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
        "id": "nd7cwqmn",
        "name": "result",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "2hlrcx5j",
        "name": "cmd",
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
    "listRule": "userId = @request.auth.id",
    "viewRule": "userId = @request.auth.id",
    "createRule": "userId = @request.auth.id && status='' && result=''",
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
})
