/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const snapshot = [
   

    {
      "id": "18rfmj8aklx6bjq",
      "created": "2023-12-22 17:15:47.557Z",
      "updated": "2023-12-29 15:07:15.882Z",
      "name": "sent_messages",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "wuitrzp6",
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
          "id": "yzvlcy7m",
          "name": "message",
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
          "id": "kigwtdjb",
          "name": "campaign",
          "type": "relation",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "collectionId": "w1vjr1edr5tsam3",
            "cascadeDelete": false,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": null
          }
        }
      ],
      "indexes": [],
      "listRule": null,
      "viewRule": null,
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "options": {}
    },
   
    {
      "id": "w1vjr1edr5tsam3",
      "created": "2023-12-29 14:50:43.496Z",
      "updated": "2024-01-05 09:13:27.720Z",
      "name": "campaign_messages",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "4h2cqwha",
          "name": "body",
          "type": "editor",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "convertUrls": false
          }
        },
        {
          "system": false,
          "id": "lxy9jyyk",
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
          "id": "wsfnencj",
          "name": "campaign",
          "type": "relation",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "collectionId": "yfhnigik0uvyt4m",
            "cascadeDelete": false,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": null
          }
        }
      ],
      "indexes": [],
      "listRule": null,
      "viewRule": null,
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "options": {}
    },
    
    {
      "id": "yfhnigik0uvyt4m",
      "created": "2024-01-05 08:50:50.016Z",
      "updated": "2024-01-05 09:08:00.316Z",
      "name": "campaigns",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "1laswhyx",
          "name": "name",
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
          "id": "4fxgwtui",
          "name": "vars",
          "type": "json",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "tni65iyd",
          "name": "usersQuery",
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
      "listRule": null,
      "viewRule": null,
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "options": {}
    },
    {
      "id": "s00x84jumfjcuvc",
      "created": "2024-01-05 08:59:19.802Z",
      "updated": "2024-01-05 08:59:19.802Z",
      "name": "subscribed_users",
      "type": "view",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "v2xqodbb",
          "name": "username",
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
          "id": "r2ir7x1v",
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
          "id": "ngvopwyl",
          "name": "subscription",
          "type": "select",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSelect": 1,
            "values": [
              "free",
              "premium",
              "lifetime",
              "legacy"
            ]
          }
        },
        {
          "system": false,
          "id": "a5yursiu",
          "name": "isLegacy",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "wly2vqr5",
          "name": "isFounder",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        }
      ],
      "indexes": [],
      "listRule": null,
      "viewRule": null,
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "options": {
        "query": "select id, username, email, subscription, isLegacy, isFounder,created,updated from users where verified=1 and unsubscribe=0"
      }
    }
  ];

  const collections = snapshot.map((item) => new Collection(item));

  return Dao(db).importCollections(collections, false, null);
}, (db) => {
  return null;
})
