/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "y7qb3zm8vslkfxj",
    "created": "2023-09-15 13:56:42.907Z",
    "updated": "2023-09-15 13:56:42.907Z",
    "name": "potentialPaidUsersView",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "2gw1y72t",
        "name": "email",
        "type": "email",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "exceptDomains": null,
          "onlyDomains": null
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
      "query": "select id,email from users where id in (select uid from instances where secondsThisMonth>6000)"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("y7qb3zm8vslkfxj");

  return dao.deleteCollection(collection);
})
