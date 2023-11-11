/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("y7qb3zm8vslkfxj");

  return dao.deleteCollection(collection);
}, (db) => {
  const collection = new Collection({
    "id": "y7qb3zm8vslkfxj",
    "created": "2023-09-15 13:56:42.907Z",
    "updated": "2023-09-27 06:39:53.322Z",
    "name": "potentialPaidUsersView",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "mkmeisox",
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
        "id": "wqw6fejd",
        "name": "secondsthismonth",
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
      "query": "SELECT u.id,\n       u.email,\n       u.secondsthismonth\nFROM   users u\nWHERE  u.verified=1 and u.secondsthismonth/60>200"
    }
  });

  return Dao(db).saveCollection(collection);
})
