/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const snapshot = [
    {
      "id": "etae8tuiaxl6xfv",
      "created": "2022-09-17 16:25:20.140Z",
      "updated": "2024-01-06 09:43:36.008Z",
      "name": "instances",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "qdtuuld1",
          "name": "subdomain",
          "type": "text",
          "required": true,
          "presentable": true,
          "unique": false,
          "options": {
            "min": null,
            "max": 50,
            "pattern": "^[a-z][a-z0-9-]{2,39}$"
          }
        },
        {
          "system": false,
          "id": "rbj14krn",
          "name": "uid",
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
          "id": "c2y74d7h",
          "name": "status",
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
          "id": "4ydffkv3",
          "name": "version",
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
          "id": "3yu1db4p",
          "name": "secrets",
          "type": "json",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSize": 2000000
          }
        },
        {
          "system": false,
          "id": "mexrkb5z",
          "name": "maintenance",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "hkt4q8yk",
          "name": "syncAdmin",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "5oz9huwg",
          "name": "cname",
          "type": "text",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": "^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,6}$"
          }
        },
        {
          "system": false,
          "id": "a5qqq8fs",
          "name": "dev",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "hsoandop",
          "name": "cname_active",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "k7nxxzdr",
          "name": "s3",
          "type": "relation",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "collectionId": "7n6rny9w7n52mvi",
            "cascadeDelete": false,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": null
          }
        },
        {
          "system": false,
          "id": "rofy4mta",
          "name": "notifyMaintenanceMode",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        }
      ],
      "indexes": [
        "CREATE UNIQUE INDEX `idx_unique_qdtuuld1` ON `instances` (`subdomain`)",
        "CREATE INDEX `idx_DKUSkMx` ON `instances` (`status`)",
        "CREATE INDEX `idx_fhfKrpl` ON `instances` (`uid`)",
        "CREATE INDEX `idx_TfdgNnO` ON `instances` (`maintenance`)",
        "CREATE INDEX `idx_FrmHehp` ON `instances` (`created`)",
        "CREATE INDEX `idx_tNMeylJ` ON `instances` (`updated`)",
        "CREATE UNIQUE INDEX `idx_rBYwAXi` ON `instances` (`cname`) WHERE cname != ''"
      ],
      "listRule": "uid=@request.auth.id",
      "viewRule": "uid = @request.auth.id",
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "options": {}
    },
    {
      "id": "systemprofiles0",
      "created": "2022-11-02 17:53:52.539Z",
      "updated": "2024-01-10 11:47:04.774Z",
      "name": "users",
      "type": "auth",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "pbfieldname",
          "name": "name",
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
          "id": "pbfieldavatar",
          "name": "avatar",
          "type": "file",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "mimeTypes": [
              "image/jpg",
              "image/jpeg",
              "image/png",
              "image/svg+xml",
              "image/gif"
            ],
            "thumbs": null,
            "maxSelect": 1,
            "maxSize": 5242880,
            "protected": false
          }
        },
        {
          "system": false,
          "id": "7jf2i4be",
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
          "id": "c1lrvx9q",
          "name": "isLegacy",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "wp3zam39",
          "name": "isFounder",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "yrezqbhc",
          "name": "discord_id",
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
          "id": "stcfuecz",
          "name": "unsubscribe",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "bbspvxke",
          "name": "notifyMaintenanceMode",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "umykxmck",
          "name": "welcome",
          "type": "date",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "min": "",
            "max": ""
          }
        }
      ],
      "indexes": [],
      "listRule": "id = @request.auth.id",
      "viewRule": "id = @request.auth.id",
      "createRule": "",
      "updateRule": "id = @request.auth.id",
      "deleteRule": null,
      "options": {
        "allowEmailAuth": true,
        "allowOAuth2Auth": true,
        "allowUsernameAuth": false,
        "exceptEmailDomains": null,
        "manageRule": null,
        "minPasswordLength": 8,
        "onlyEmailDomains": null,
        "onlyVerified": false,
        "requireEmail": true
      }
    },
    {
      "id": "buq519uv711078p",
      "created": "2023-12-13 12:27:18.834Z",
      "updated": "2023-12-14 15:59:34.478Z",
      "name": "stats",
      "type": "view",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "ocbcyask",
          "name": "total_users",
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
          "id": "q5okyyvj",
          "name": "total_legacy_subscribers",
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
          "id": "a8mv3hbg",
          "name": "total_free_subscribers",
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
          "id": "bkn9fxd9",
          "name": "total_pro_subscribers",
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
          "id": "qkyv0nvm",
          "name": "total_lifetime_subscribers",
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
          "id": "g6hgzcbi",
          "name": "new_users_last_hour",
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
          "id": "6e2gep5p",
          "name": "new_users_last_24_hours",
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
          "id": "qdd2lgrg",
          "name": "new_users_last_7_days",
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
          "id": "mdsqys16",
          "name": "new_users_last_30_days",
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
          "id": "lz1oyvrc",
          "name": "total_instances",
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
          "id": "ntg2cv49",
          "name": "total_instances_last_hour",
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
          "id": "o5o8e0a3",
          "name": "total_instances_last_24_hours",
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
          "id": "bi4hgf4i",
          "name": "total_instances_last_7_days",
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
          "id": "e65bogl0",
          "name": "total_instances_last_30_days",
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
          "id": "uxq8augl",
          "name": "new_instances_last_hour",
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
          "id": "w4k4qocm",
          "name": "new_instances_last_24_hours",
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
          "id": "vpbfbm1f",
          "name": "new_instances_last_7_days",
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
          "id": "xactzvom",
          "name": "new_instances_last_30_days",
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
        "query": "SELECT\n  (ROW_NUMBER() OVER()) as id,\n  \n    COUNT(DISTINCT users.id) AS total_users,\n    COUNT(DISTINCT CASE WHEN users.subscription ='legacy' THEN users.id END) AS total_legacy_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription ='free' THEN users.id END) AS total_free_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' THEN users.id END) AS total_pro_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'lifetime' THEN users.id END) AS total_lifetime_subscribers,\n  \n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-1 hour') THEN users.id END) AS new_users_last_hour,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-24 hours') THEN users.id END) AS new_users_last_24_hours,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-7 days') THEN users.id END) AS new_users_last_7_days,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-30 days') THEN users.id END) AS new_users_last_30_days,\n  \n    COUNT(DISTINCT instances.id ) AS total_instances,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-1 hour') THEN instances.id END) AS total_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-24 hours') THEN instances.id END) AS total_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-7 days') THEN instances.id END) AS total_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-30 days') THEN instances.id END) AS total_instances_last_30_days,\n  \n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-1 hour') THEN instances.id END) AS new_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-24 hours') THEN instances.id END) AS new_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-7 days') THEN instances.id END) AS new_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-30 days') THEN instances.id END) AS new_instances_last_30_days\n  \nFROM\n    verified_users users\nLEFT JOIN\n    instances ON users.id = instances.uid;\n"
      }
    },
    {
      "id": "aif4h1j462iqopo",
      "created": "2023-12-14 09:01:33.345Z",
      "updated": "2023-12-14 09:08:41.595Z",
      "name": "settings",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "a0gyirdi",
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
          "id": "xso1u0og",
          "name": "value",
          "type": "json",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSize": 2000000
          }
        }
      ],
      "indexes": [
        "CREATE INDEX `idx_qMbeGsg` ON `settings` (`name`)"
      ],
      "listRule": "",
      "viewRule": "",
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "options": {}
    },
    {
      "id": "4kshuv7r3jdrst4",
      "created": "2023-12-14 15:47:15.041Z",
      "updated": "2023-12-24 17:33:36.849Z",
      "name": "verified_users",
      "type": "view",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "5cg5wgrf",
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
          "id": "o2j25t4a",
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
          "id": "emdb7k7j",
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
          "id": "kygqqzeb",
          "name": "isLegacy",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "qy6jora9",
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
        "query": "select id, username, email, subscription, isLegacy, isFounder,created,updated from users where verified = 1"
      }
    },
    {
      "id": "7vzz1jr2us7mwmx",
      "created": "2023-12-14 16:30:33.330Z",
      "updated": "2023-12-15 13:31:07.128Z",
      "name": "user_growth_by_month",
      "type": "view",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "pk5at00z",
          "name": "t",
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
          "id": "3ybi74j4",
          "name": "c",
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
        "query": "SELECT \n   (ROW_NUMBER() OVER()) as id,\n    strftime('%Y-%m', created) AS t, \n    COUNT(*) AS c \nFROM \n    verified_users as users\nGROUP BY \n    t\n\torder by t desc\n"
      }
    },
    {
      "id": "thjxyrzo35idz7s",
      "created": "2023-12-14 16:38:00.529Z",
      "updated": "2023-12-15 13:28:54.353Z",
      "name": "growth_by_day",
      "type": "view",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "ghgoehkw",
          "name": "created_day",
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
          "id": "uhyqirzc",
          "name": "users_count",
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
          "id": "nv9hcwkf",
          "name": "instances_count",
          "type": "json",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSize": 1
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
        "query": "SELECT \n    (ROW_NUMBER() OVER()) as id,\n    created_day,\n    SUM(users_count) AS users_count,\n    SUM(instances_count) AS instances_count\nFROM (\n    SELECT \n        strftime('%Y-%m-%d', users.created) AS created_day, \n        COUNT(*) AS users_count, \n        0 AS instances_count\n    FROM \n        users \n    GROUP BY \n        created_day\n    UNION ALL\n    SELECT \n        strftime('%Y-%m-%d', instances.created) AS created_day, \n        0 AS users_count, \n        COUNT(*) AS instances_count\n    FROM \n        instances \n    GROUP BY \n        created_day\n) \nGROUP BY \n    created_day\norder by created_day desc\n"
      }
    },
    {
      "id": "ledwhu6imoityio",
      "created": "2023-12-15 13:31:50.847Z",
      "updated": "2023-12-24 17:33:36.855Z",
      "name": "unverified_users",
      "type": "view",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "grpncfep",
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
          "id": "ijsrdmwp",
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
          "id": "e31p6ova",
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
          "id": "lxitczix",
          "name": "isLegacy",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "umh2fccl",
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
        "query": "select id, username, email, subscription, isLegacy, isFounder,created,updated from users where verified = 0"
      }
    },
    {
      "id": "18rfmj8aklx6bjq",
      "created": "2023-12-22 17:15:47.557Z",
      "updated": "2024-01-06 10:50:16.459Z",
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
          "name": "campaign_message",
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
      "id": "4jyrkxcora6bl8r",
      "created": "2023-12-24 03:51:53.315Z",
      "updated": "2023-12-24 17:33:36.858Z",
      "name": "legacy_users",
      "type": "view",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "t0mmenni",
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
          "id": "wwsyffsl",
          "name": "isFounder",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "tdna703r",
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
        }
      ],
      "indexes": [],
      "listRule": null,
      "viewRule": null,
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "options": {
        "query": "select u.id, u.email,u.isFounder,u.subscription,u.created,u.updated from verified_users u where u.isLegacy=1"
      }
    },
    {
      "id": "iff2jfzb89dwiov",
      "created": "2023-12-24 17:21:14.169Z",
      "updated": "2024-01-04 09:57:09.867Z",
      "name": "payments",
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
          "name": "payment_id",
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
        "CREATE INDEX `idx_DezkBvw` ON `payments` (`user`)",
        "CREATE INDEX `idx_A5j325f` ON `payments` (`payment_id`)",
        "CREATE INDEX `idx_qBPC3VW` ON `payments` (`created`)",
        "CREATE UNIQUE INDEX `idx_NPkwSnu` ON `payments` (`payment_id`)"
      ],
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
      "updated": "2024-01-05 17:05:50.218Z",
      "name": "campaign_messages",
      "type": "base",
      "system": false,
      "schema": [
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
          "id": "4h2cqwha",
          "name": "body",
          "type": "editor",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "convertUrls": false
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
      "id": "7n6rny9w7n52mvi",
      "created": "2023-12-30 15:27:51.880Z",
      "updated": "2023-12-30 15:30:46.145Z",
      "name": "s3",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "yvy0exvk",
          "name": "instance",
          "type": "relation",
          "required": false,
          "presentable": true,
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
          "id": "kz6u1z1p",
          "name": "endpoint",
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
          "id": "etcgfvgc",
          "name": "access_key",
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
          "id": "fn8ulajr",
          "name": "secret",
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
          "id": "kktzqpxi",
          "name": "bucket",
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
          "id": "fysmrb1v",
          "name": "region",
          "type": "text",
          "required": false,
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
      "id": "yfhnigik0uvyt4m",
      "created": "2024-01-05 08:50:50.016Z",
      "updated": "2024-01-05 17:03:19.348Z",
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
          "options": {
            "maxSize": 20000
          }
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
      "updated": "2024-01-05 17:00:07.941Z",
      "name": "subscribed_users",
      "type": "view",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "s2197q2z",
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
          "id": "cuhc31f3",
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
          "id": "ciq66ylh",
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
          "id": "ko9likeb",
          "name": "isLegacy",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "98xd2uwo",
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
    },
    {
      "id": "hsuwe2h3csch1yr",
      "created": "2024-01-07 07:16:49.459Z",
      "updated": "2024-01-08 14:46:00.858Z",
      "name": "audit",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "cgkurilx",
          "name": "event",
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
          "id": "orqvyzje",
          "name": "email",
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
          "id": "3frdgrxe",
          "name": "user",
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
          "id": "kcj9mpcm",
          "name": "notification",
          "type": "relation",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "collectionId": "y5lqraz7c4jvisu",
            "cascadeDelete": false,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": null
          }
        },
        {
          "system": false,
          "id": "sterc0x6",
          "name": "instance",
          "type": "relation",
          "required": false,
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
          "id": "rtfafgv0",
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
        },
        {
          "system": false,
          "id": "vsobm1jq",
          "name": "campaign_message",
          "type": "relation",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "collectionId": "w1vjr1edr5tsam3",
            "cascadeDelete": false,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": null
          }
        },
        {
          "system": false,
          "id": "nztvxk7i",
          "name": "sent_message",
          "type": "relation",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "collectionId": "18rfmj8aklx6bjq",
            "cascadeDelete": false,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": null
          }
        },
        {
          "system": false,
          "id": "chqbmew7",
          "name": "note",
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
          "id": "9vjfnw4e",
          "name": "raw_payload",
          "type": "text",
          "required": false,
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
      "id": "y5lqraz7c4jvisu",
      "created": "2024-01-08 13:55:45.485Z",
      "updated": "2024-01-08 18:24:16.818Z",
      "name": "notifications",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "dwn9j8oo",
          "name": "channel",
          "type": "select",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSelect": 1,
            "values": [
              "email",
              "lemonbot"
            ]
          }
        },
        {
          "system": false,
          "id": "ry5pnrld",
          "name": "user",
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
          "id": "fksunfv1",
          "name": "instance",
          "type": "relation",
          "required": false,
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
          "id": "gmqwgamf",
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
        },
        {
          "system": false,
          "id": "crksfxsv",
          "name": "campaign_message",
          "type": "relation",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "collectionId": "w1vjr1edr5tsam3",
            "cascadeDelete": false,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": null
          }
        },
        {
          "system": false,
          "id": "qoshryii",
          "name": "sent_message",
          "type": "relation",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "collectionId": "18rfmj8aklx6bjq",
            "cascadeDelete": false,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": null
          }
        },
        {
          "system": false,
          "id": "cmkxbt9j",
          "name": "payment",
          "type": "relation",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "collectionId": "iff2jfzb89dwiov",
            "cascadeDelete": false,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": null
          }
        },
        {
          "system": false,
          "id": "ezyqswtg",
          "name": "payload",
          "type": "json",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSize": 2000000
          }
        },
        {
          "system": false,
          "id": "sgeq9rbv",
          "name": "delivered",
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
          "id": "v8zn89fa",
          "name": "message_template",
          "type": "relation",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "collectionId": "6m8h2sy0nutig46",
            "cascadeDelete": false,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": null
          }
        },
        {
          "system": false,
          "id": "zoqchc2l",
          "name": "message_template_vars",
          "type": "json",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSize": 2000000
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
      "id": "6m8h2sy0nutig46",
      "created": "2024-01-08 18:12:45.214Z",
      "updated": "2024-01-08 18:12:45.214Z",
      "name": "message_templates",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "si53ohkr",
          "name": "slug",
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
          "id": "zarqosgs",
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
          "id": "woodsq1c",
          "name": "body_html",
          "type": "editor",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "convertUrls": false
          }
        }
      ],
      "indexes": [
        "CREATE UNIQUE INDEX `idx_7e53x5A` ON `message_templates` (`slug`)"
      ],
      "listRule": null,
      "viewRule": null,
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "options": {}
    },
    {
      "id": "h055gvw3oqi2fs0",
      "created": "2024-01-12 11:12:59.598Z",
      "updated": "2024-01-12 11:20:00.505Z",
      "name": "duplicate_emails",
      "type": "view",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "y2akvv89",
          "name": "email_prefix",
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
          "id": "za7mr8gw",
          "name": "email_domain",
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
          "id": "zjwougcm",
          "name": "count",
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
        "query": "SELECT \n  (ROW_NUMBER() OVER()) as id,\n    SUBSTR(email, 1, INSTR(email, '@') - 1) AS email_prefix,\n    SUBSTR(email, INSTR(email, '@')) AS email_domain,\n    COUNT(*) AS count\nFROM \n    (SELECT \n         CASE \n             WHEN INSTR(SUBSTR(email, 1, INSTR(email, '@') - 1), '+') > 0 \n             THEN SUBSTR(email, 1, INSTR(SUBSTR(email, 1, INSTR(email, '@') - 1), '+') - 1) || SUBSTR(email, INSTR(email, '@')) \n             ELSE email \n         END AS email \n     FROM users)\nGROUP BY \n    email_prefix, email_domain;\n"
      }
    }
  ];

  const collections = snapshot.map((item) => new Collection(item));

  return Dao(db).importCollections(collections, true, null);
}, (db) => {
  return null;
})
