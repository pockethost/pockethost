/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "7vzz1jr2us7mwmx",
    "created": "2023-12-14 16:30:33.330Z",
    "updated": "2023-12-14 16:30:33.330Z",
    "name": "user_growth_by_month",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "r2f9pxks",
        "name": "created_month",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 1
        }
      },
      {
        "system": false,
        "id": "hfwcgpmi",
        "name": "number_of_users",
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
      "query": "SELECT \n   (ROW_NUMBER() OVER()) as id,\n    strftime('%Y-%m', created) AS created_month, \n    COUNT(*) AS number_of_users \nFROM \n    users \nGROUP BY \n    created_month\n\torder by created_month asc\n"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("7vzz1jr2us7mwmx");

  return dao.deleteCollection(collection);
})
