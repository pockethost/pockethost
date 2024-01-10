/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "6m8h2sy0nutig46",
    "created": "2024-01-08 18:12:45.214Z",
    "updated": "2024-01-08 18:12:45.214Z",
    "name": "message_templates",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "si53ohkr",
        "name": "slug",
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
        "id": "zarqosgs",
        "name": "subject",
        "type": "text",
        "required": true,
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
        "id": "woodsq1c",
        "name": "body_html",
        "type": "editor",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "convertUrls": false
        }
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_7e53x5A` ON `message_templates` (`slug`)"
    ],
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
  const collection = dao.findCollectionByNameOrId("6m8h2sy0nutig46");

  return dao.deleteCollection(collection);
})
