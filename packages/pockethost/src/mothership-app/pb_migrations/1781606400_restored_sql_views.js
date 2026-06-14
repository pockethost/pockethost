/// <reference path="../src/types/types.d.ts" />
/// Restores mothership SQL views dropped by mothership-v039-preupgrade.sql before first PB 0.39 boot.
migrate((app) => {
  const snapshot = [
  {
    "id": "4kshuv7r3jdrst4",
    "name": "verified_users",
    "type": "view",
    "system": false,
    "viewQuery": "select id, username, email, subscription, subscription_interval, tokenKey, unsubscribe, created, updated from users where verified = 1",
    "fields": [
      {
        "id": "p84zuh5s",
        "name": "username",
        "type": "text",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "pattern": ""
      },
      {
        "id": "9cvv0zph",
        "name": "email",
        "type": "email",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "exceptDomains": null,
        "onlyDomains": null
      },
      {
        "id": "s1xad73d",
        "name": "subscription",
        "type": "select",
        "system": false,
        "required": true,
        "presentable": false,
        "primaryKey": false,
        "maxSelect": 1,
        "values": [
          "free",
          "premium",
          "lifetime",
          "legacy"
        ]
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null
  },
  {
    "id": "s00x84jumfjcuvc",
    "name": "subscribed_users",
    "type": "view",
    "system": false,
    "viewQuery": "select id, username, email, subscription, subscription_interval, created, updated from verified_users where unsubscribe=0",
    "fields": [
      {
        "id": "bm01zt0c",
        "name": "username",
        "type": "text",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "pattern": ""
      },
      {
        "id": "q5mz7sy4",
        "name": "email",
        "type": "email",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "exceptDomains": null,
        "onlyDomains": null
      },
      {
        "id": "rsimzkmj",
        "name": "subscription",
        "type": "select",
        "system": false,
        "required": true,
        "presentable": false,
        "primaryKey": false,
        "maxSelect": 1,
        "values": [
          "free",
          "premium",
          "lifetime",
          "legacy"
        ]
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null
  },
  {
    "id": "ledwhu6imoityio",
    "name": "unverified_users",
    "type": "view",
    "system": false,
    "viewQuery": "select id, username, email, subscription, created, updated from users where verified = 0",
    "fields": [
      {
        "id": "qb7sqdt4",
        "name": "username",
        "type": "text",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "pattern": ""
      },
      {
        "id": "jen5x1yw",
        "name": "email",
        "type": "email",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "exceptDomains": null,
        "onlyDomains": null
      },
      {
        "id": "ky0mtxk7",
        "name": "subscription",
        "type": "select",
        "system": false,
        "required": true,
        "presentable": false,
        "primaryKey": false,
        "maxSelect": 1,
        "values": [
          "free",
          "premium",
          "lifetime",
          "legacy"
        ]
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null
  },
  {
    "id": "h055gvw3oqi2fs0",
    "name": "duplicate_emails",
    "type": "view",
    "system": false,
    "viewQuery": "SELECT \n  (ROW_NUMBER() OVER()) as id,\n    SUBSTR(email, 1, INSTR(email, '@') - 1) AS email_prefix,\n    SUBSTR(email, INSTR(email, '@')) AS email_domain,\n    COUNT(*) AS count\nFROM \n    (SELECT \n         CASE \n             WHEN INSTR(SUBSTR(email, 1, INSTR(email, '@') - 1), '+') > 0 \n             THEN SUBSTR(email, 1, INSTR(SUBSTR(email, 1, INSTR(email, '@') - 1), '+') - 1) || SUBSTR(email, INSTR(email, '@')) \n             ELSE email \n         END AS email \n     FROM users)\nGROUP BY \n    email_prefix, email_domain;\n",
    "fields": [
      {
        "id": "hy2ph2kc",
        "name": "email_prefix",
        "type": "json",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "maxSize": 1
      },
      {
        "id": "fq92utcd",
        "name": "email_domain",
        "type": "json",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "maxSize": 1
      },
      {
        "id": "ayhytcq7",
        "name": "count",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null
  },
  {
    "id": "thjxyrzo35idz7s",
    "name": "growth_by_day",
    "type": "view",
    "system": false,
    "viewQuery": "SELECT \n    (ROW_NUMBER() OVER()) as id,\n    created_day,\n    SUM(users_count) AS users_count,\n    SUM(instances_count) AS instances_count\nFROM (\n    SELECT \n        strftime('%Y-%m-%d', users.created) AS created_day, \n        COUNT(*) AS users_count, \n        0 AS instances_count\n    FROM \n        users \n    GROUP BY \n        created_day\n    UNION ALL\n    SELECT \n        strftime('%Y-%m-%d', instances.created) AS created_day, \n        0 AS users_count, \n        COUNT(*) AS instances_count\n    FROM \n        instances \n    GROUP BY \n        created_day\n) \nGROUP BY \n    created_day\norder by created_day desc\n",
    "fields": [
      {
        "id": "xezxdxj3",
        "name": "created_day",
        "type": "json",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "maxSize": 1
      },
      {
        "id": "waxqxcex",
        "name": "users_count",
        "type": "json",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "maxSize": 1
      },
      {
        "id": "kcllgjtf",
        "name": "instances_count",
        "type": "json",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "maxSize": 1
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null
  },
  {
    "id": "7vzz1jr2us7mwmx",
    "name": "user_growth_by_month",
    "type": "view",
    "system": false,
    "viewQuery": "SELECT \n   (ROW_NUMBER() OVER()) as id,\n    strftime('%Y-%m', created) AS t, \n    COUNT(*) AS c \nFROM \n    verified_users as users\nGROUP BY \n    t\n\torder by t desc\n",
    "fields": [
      {
        "id": "kbncraou",
        "name": "t",
        "type": "json",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "maxSize": 1
      },
      {
        "id": "laq2glwk",
        "name": "c",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null
  },
  {
    "id": "buq519uv711078p",
    "name": "stats",
    "type": "view",
    "system": false,
    "viewQuery": "SELECT\n  (ROW_NUMBER() OVER()) as id,\n    COUNT(DISTINCT users.id) AS total_users,\n    COUNT(DISTINCT CASE WHEN users.subscription ='legacy' THEN users.id END) AS total_legacy_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription ='free' THEN users.id END) AS total_free_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' THEN users.id END) AS total_pro_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' and users.subscription_interval='month' THEN users.id END) AS total_pro_month_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' and users.subscription_interval='year' THEN users.id END) AS total_pro_year_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'founder' THEN users.id END) AS total_founder_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'flounder' THEN users.id END) AS total_flounder_subscribers,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-1 hour') THEN users.id END) AS new_users_last_hour,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-24 hours') THEN users.id END) AS new_users_last_24_hours,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-7 days') THEN users.id END) AS new_users_last_7_days,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-30 days') THEN users.id END) AS new_users_last_30_days,\n    COUNT(DISTINCT instances.id ) AS total_instances,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-1 hour') THEN instances.id END) AS total_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-24 hours') THEN instances.id END) AS total_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-7 days') THEN instances.id END) AS total_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-30 days') THEN instances.id END) AS total_instances_last_30_days,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-1 hour') THEN instances.id END) AS new_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-24 hours') THEN instances.id END) AS new_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-7 days') THEN instances.id END) AS new_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-30 days') THEN instances.id END) AS new_instances_last_30_days\nFROM\n    verified_users users\nLEFT JOIN\n    instances ON users.id = instances.uid",
    "fields": [
      {
        "id": "qpbvc5ut",
        "name": "total_users",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      },
      {
        "id": "qlnytqmj",
        "name": "total_legacy_subscribers",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      },
      {
        "id": "zbaplkwv",
        "name": "total_free_subscribers",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      },
      {
        "id": "exu5uwpy",
        "name": "total_pro_subscribers",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      },
      {
        "id": "enur9h6p",
        "name": "new_users_last_hour",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      },
      {
        "id": "zypx3s5g",
        "name": "new_users_last_24_hours",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      },
      {
        "id": "8o6qwwpk",
        "name": "new_users_last_7_days",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      },
      {
        "id": "owppxkp1",
        "name": "new_users_last_30_days",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      },
      {
        "id": "t5hfbuy0",
        "name": "total_instances",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      },
      {
        "id": "hy6ksvwr",
        "name": "total_instances_last_hour",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      },
      {
        "id": "esvqpfks",
        "name": "total_instances_last_24_hours",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      },
      {
        "id": "yl9gsbnh",
        "name": "total_instances_last_7_days",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      },
      {
        "id": "fob5xhbs",
        "name": "total_instances_last_30_days",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      },
      {
        "id": "upjeewnx",
        "name": "new_instances_last_hour",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      },
      {
        "id": "2quxsopb",
        "name": "new_instances_last_24_hours",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      },
      {
        "id": "9u8mi3xv",
        "name": "new_instances_last_7_days",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      },
      {
        "id": "crqnqirt",
        "name": "new_instances_last_30_days",
        "type": "number",
        "system": false,
        "required": false,
        "presentable": false,
        "primaryKey": false,
        "min": null,
        "max": null,
        "noDecimal": false
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null
  }
];

  return app.importCollections(snapshot, false);
}, (app) => {
  for (const name of ["verified_users","subscribed_users","unverified_users","duplicate_emails","growth_by_day","user_growth_by_month","stats"]) {
    try {
      const collection = app.findCollectionByNameOrId(name);
      app.delete(collection);
    } catch (_) {}
  }
  return true;
});
