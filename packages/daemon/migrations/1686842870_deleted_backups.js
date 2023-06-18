migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("72clb6v41bzsay9");

  return dao.deleteCollection(collection);
}, (db) => {
  const collection = new Collection({
    "id": "72clb6v41bzsay9",
    "created": "2022-11-09 15:23:20.313Z",
    "updated": "2023-06-10 09:12:01.004Z",
    "name": "backups",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "someqtjw",
        "name": "message",
        "type": "text",
        "required": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "jk4zwiaj",
        "name": "instanceId",
        "type": "relation",
        "required": true,
        "unique": false,
        "options": {
          "collectionId": "etae8tuiaxl6xfv",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "wsy3l5gm",
        "name": "status",
        "type": "text",
        "required": true,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "gmkrc5d9",
        "name": "bytes",
        "type": "number",
        "required": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null
        }
      },
      {
        "system": false,
        "id": "fheqxmbj",
        "name": "version",
        "type": "text",
        "required": true,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "cinbmdwe",
        "name": "progress",
        "type": "json",
        "required": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [],
    "listRule": "@request.auth.id = instanceId.uid",
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
})
