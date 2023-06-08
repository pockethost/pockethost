migrate((db) => {
  const snapshot = [
    {
      "id": "etae8tuiaxl6xfv",
      "created": "2022-10-20 08:51:44.195Z",
      "updated": "2023-06-07 22:41:11.725Z",
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
          "unique": true,
          "options": {
            "min": null,
            "max": 50,
            "pattern": "^[a-z][\\-a-z]+$"
          }
        },
        {
          "system": false,
          "id": "rbj14krn",
          "name": "uid",
          "type": "relation",
          "required": true,
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
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "yxby5r6b",
          "name": "platform",
          "type": "text",
          "required": true,
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
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "1arlklqq",
          "name": "secondsThisMonth",
          "type": "number",
          "required": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null
          }
        },
        {
          "system": false,
          "id": "66vjgzcg",
          "name": "isBackupAllowed",
          "type": "bool",
          "required": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "qew2o2d6",
          "name": "currentWorkerBundleId",
          "type": "text",
          "required": false,
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
          "unique": false,
          "options": {}
        }
      ],
      "indexes": [
        "CREATE UNIQUE INDEX \"idx_unique_qdtuuld1\" on \"instances\" (\"subdomain\")"
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
      "created": "2022-10-31 21:31:52.175Z",
      "updated": "2023-06-07 22:41:11.723Z",
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
          "unique": false,
          "options": {
            "maxSelect": 1,
            "maxSize": 5242880,
            "mimeTypes": [
              "image/jpg",
              "image/jpeg",
              "image/png",
              "image/svg+xml",
              "image/gif"
            ],
            "thumbs": null,
            "protected": false
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
        "requireEmail": true
      }
    },
    {
      "id": "aiw8te7y7atklwn",
      "created": "2022-11-04 13:54:23.745Z",
      "updated": "2023-06-07 22:41:11.723Z",
      "name": "invocations",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "st9ydrbo",
          "name": "instanceId",
          "type": "relation",
          "required": true,
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
          "unique": false,
          "options": {
            "min": null,
            "max": null
          }
        },
        {
          "system": false,
          "id": "vdkfqege",
          "name": "totalSeconds",
          "type": "number",
          "required": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null
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
      "id": "v7s41iokt1vizxd",
      "created": "2022-11-06 17:23:25.947Z",
      "updated": "2023-06-07 22:41:11.723Z",
      "name": "rpc",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "yv38czcf",
          "name": "userId",
          "type": "relation",
          "required": true,
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
          "id": "tgvaxwfv",
          "name": "payload",
          "type": "json",
          "required": true,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "zede8pci",
          "name": "status",
          "type": "text",
          "required": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "nd7cwqmn",
          "name": "result",
          "type": "json",
          "required": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "2hlrcx5j",
          "name": "cmd",
          "type": "text",
          "required": true,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        }
      ],
      "indexes": [],
      "listRule": "userId = @request.auth.id",
      "viewRule": "userId = @request.auth.id",
      "createRule": "userId = @request.auth.id && status='' && result='' && cmd ?= @collection.rpc_cmds.name",
      "updateRule": null,
      "deleteRule": null,
      "options": {}
    },
    {
      "id": "72clb6v41bzsay9",
      "created": "2022-11-09 15:23:20.313Z",
      "updated": "2023-06-07 22:41:11.723Z",
      "name": "backups",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "someqtjw",
          "name": "message",
          "type": "text",
          "required": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "jk4zwiaj",
          "name": "instanceId",
          "type": "relation",
          "required": true,
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
          "id": "wsy3l5gm",
          "name": "status",
          "type": "text",
          "required": true,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "gmkrc5d9",
          "name": "bytes",
          "type": "number",
          "required": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null
          }
        },
        {
          "system": false,
          "id": "4lmammjz",
          "name": "platform",
          "type": "text",
          "required": true,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "fheqxmbj",
          "name": "version",
          "type": "text",
          "required": true,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "cinbmdwe",
          "name": "progress",
          "type": "json",
          "required": false,
          "unique": false,
          "options": {}
        }
      ],
      "indexes": [],
      "listRule": "@request.auth.id = instanceId.uid",
      "viewRule": null,
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "options": {}
    },
    {
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
    }
  ];

  const collections = snapshot.map((item) => new Collection(item));

  return Dao(db).importCollections(collections, true, null);
}, (db) => {
  return null;
})
