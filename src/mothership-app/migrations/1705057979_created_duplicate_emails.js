/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "h055gvw3oqi2fs0",
    "created": "2024-01-12 11:12:59.598Z",
    "updated": "2024-01-12 11:12:59.598Z",
    "name": "duplicate_emails",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "9hblghvi",
        "name": "domain",
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
        "id": "csleeffq",
        "name": "user_count",
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
      "query": "SELECT (ROW_NUMBER() OVER()) as id, SUBSTR(email, INSTR(email, '@')) AS domain, COUNT(*) AS user_count\nFROM users\nGROUP BY domain\nORDER BY user_count DESC;\n"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("h055gvw3oqi2fs0");

  return dao.deleteCollection(collection);
})
