migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("enp8mrv5ewtrltj");

  return dao.deleteCollection(collection);
}, (db) => {
  const collection = new Collection({
    "id": "enp8mrv5ewtrltj",
    "created": "2023-01-06 10:21:51.659Z",
    "updated": "2023-06-07 22:41:11.725Z",
    "name": "rpc_cmds",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "jbostfhp",
        "name": "name",
        "type": "text",
        "required": true,
        "unique": true,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX \"idx_unique_jbostfhp\" on \"rpc_cmds\" (\"name\")"
    ],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
})
