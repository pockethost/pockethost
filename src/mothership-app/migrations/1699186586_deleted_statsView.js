/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("se6fljwhhc03k4q");

  return dao.deleteCollection(collection);
}, (db) => {
  const collection = new Collection({
    "id": "se6fljwhhc03k4q",
    "created": "2023-06-23 01:11:55.281Z",
    "updated": "2023-08-13 14:10:47.344Z",
    "name": "statsView",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "hwuhhncl",
        "name": "daysUp",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "4ki5frha",
        "name": "userCount",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "t0sc7gbx",
        "name": "runningInstanceCount",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "tdzm0fm9",
        "name": "instanceCount",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "qgwuokdt",
        "name": "instanceCount1Hour",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "qdfrdpgw",
        "name": "instanceCount1Day",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "7zyst2n4",
        "name": "instanceCount7Day",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "spsatpua",
        "name": "instanceCount30Day",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "hkqkppxr",
        "name": "invocationCount",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "p1elamx9",
        "name": "invocationCount1Hour",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "zx0hsiah",
        "name": "invocationCount1Day",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "3umjdlx9",
        "name": "invocationCount7Day",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "e6vw9wsl",
        "name": "invocationCount30Day",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "ms888ft7",
        "name": "invocationSeconds",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "bv2uips5",
        "name": "invocationSeconds1Hour",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "zf8r0moy",
        "name": "invocationSeconds1Day",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "ufpswspy",
        "name": "invocationSeconds7Day",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "gd98rnvo",
        "name": "invocationSeconds30Day",
        "type": "json",
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
      "query": "select\n  (ROW_NUMBER() OVER()) as id, \n  (select  julianday('now') - julianday( '2023-06-01' )) as daysUp,\n  (select count(*) from users where verified=TRUE) as userCount,\n  (select count(*) from instances where status='running') as runningInstanceCount,\n  (select count(distinct instanceId) from invocations ) as instanceCount,\n  (select count(distinct instanceId) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-1 hour'))) as instanceCount1Hour,\n  (select count(distinct instanceId) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-1 day'))) as instanceCount1Day,\n    (select count(distinct instanceId) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-7 day'))) as instanceCount7Day,\n    (select count(distinct instanceId) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-30 day'))) as instanceCount30Day,\n  (select count(*) from invocations) as invocationCount,\n  (select count(*) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-1 hour'))) as invocationCount1Hour,\n(select count(*) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-1 day'))) as invocationCount1Day,\n(select count(*) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-7 day'))) as invocationCount7Day,\n(select count(*) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-30 day'))) as invocationCount30Day,\n  (select sum(totalSeconds) from invocations) as invocationSeconds,\n  (select sum(totalSeconds) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-1 hour'))) as invocationSeconds1Hour,\n  (select sum(totalSeconds) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-1 day'))) as invocationSeconds1Day,\n  (select sum(totalSeconds) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-7 day'))) as invocationSeconds7Day,\n  (select sum(totalSeconds) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-30 day'))) as invocationSeconds30Day\n\n\n\n\n\n\n\n\n"
    }
  });

  return Dao(db).saveCollection(collection);
})
