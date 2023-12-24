/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "4kshuv7r3jdrst4",
    "created": "2023-12-14 15:47:15.041Z",
    "updated": "2023-12-14 15:47:15.041Z",
    "name": "verified_users",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "ztrckqeh",
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
      "query": "select id, email,created,updated from users where verified = 1"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("4kshuv7r3jdrst4");

  return dao.deleteCollection(collection);
})
