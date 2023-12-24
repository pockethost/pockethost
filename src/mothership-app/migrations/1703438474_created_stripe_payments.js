/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "iff2jfzb89dwiov",
    "created": "2023-12-24 17:21:14.169Z",
    "updated": "2023-12-24 17:21:14.169Z",
    "name": "stripe_payments",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "uhurtdtl",
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
        "id": "tgaer8rx",
        "name": "stripe_payment_id",
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
    "indexes": [
      "CREATE INDEX `idx_DezkBvw` ON `stripe_payments` (`user`)",
      "CREATE INDEX `idx_A5j325f` ON `stripe_payments` (`stripe_payment_id`)",
      "CREATE INDEX `idx_qBPC3VW` ON `stripe_payments` (`created`)"
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
  const collection = dao.findCollectionByNameOrId("iff2jfzb89dwiov");

  return dao.deleteCollection(collection);
})
