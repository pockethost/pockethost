/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("aiw8te7y7atklwn");

  return dao.deleteCollection(collection);
}, (db) => {
  const collection = new Collection({
    "id": "aiw8te7y7atklwn",
    "created": "2022-11-06 06:05:46.988Z",
    "updated": "2023-10-02 10:58:44.665Z",
    "name": "invocations",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "kmyokg1d",
        "name": "uid",
        "type": "relation",
        "required": false,
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
        "id": "st9ydrbo",
        "name": "instanceId",
        "type": "relation",
        "required": true,
        "presentable": false,
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
        "id": "av4mpuyh",
        "name": "startedAt",
        "type": "date",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "fnwatixg",
        "name": "endedAt",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "awjozhbn",
        "name": "pid",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "vdkfqege",
        "name": "totalSeconds",
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
    "indexes": [
      "CREATE INDEX `idx_CTV52b6` ON `invocations` (`created`)",
      "CREATE INDEX `idx_6rNZeTK` ON `invocations` (`instanceId`)",
      "CREATE INDEX `idx_LTmqfbC` ON `invocations` (`totalSeconds`)",
      "CREATE INDEX `idx_7YR9a3g` ON `invocations` (\n  `instanceId`,\n  `created`\n)",
      "CREATE INDEX `idx_ntC1d1L` ON `invocations` (\n  `totalSeconds`,\n  `created`\n)",
      "CREATE INDEX `idx_vViR75E` ON `invocations` (\n  `created`,\n  `totalSeconds`\n)",
      "CREATE INDEX `idx_q9LanEj` ON `invocations` (\n  `created`,\n  `instanceId`\n)",
      "CREATE INDEX `idx_ueUQe1N` ON `invocations` (`uid`)",
      "CREATE INDEX `idx_gh6iEUG` ON `invocations` (\n  `instanceId`,\n  `startedAt`\n)",
      "CREATE INDEX `idx_CUsNbfu` ON `invocations` (\n  `uid`,\n  `startedAt`\n)",
      "CREATE INDEX `idx_O3bEfl0` ON `invocations` (`updated`)",
      "CREATE INDEX `idx_qOyDhVG` ON `invocations` (`created`)",
      "CREATE INDEX `idx_UM6cwSA` ON `invocations` (`instanceId`)",
      "CREATE INDEX `idx_nMr318s` ON `invocations` (`totalSeconds`)"
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
