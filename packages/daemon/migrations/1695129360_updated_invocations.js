/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("aiw8te7y7atklwn")

  collection.indexes = [
    "CREATE INDEX `idx_CTV52b6` ON `invocations` (`created`)",
    "CREATE INDEX `idx_6rNZeTK` ON `invocations` (`instanceId`)",
    "CREATE INDEX `idx_LTmqfbC` ON `invocations` (`totalSeconds`)",
    "CREATE INDEX `idx_7YR9a3g` ON `invocations` (\n  `instanceId`,\n  `created`\n)",
    "CREATE INDEX `idx_ntC1d1L` ON `invocations` (\n  `totalSeconds`,\n  `created`\n)",
    "CREATE INDEX `idx_vViR75E` ON `invocations` (\n  `created`,\n  `totalSeconds`\n)",
    "CREATE INDEX `idx_q9LanEj` ON `invocations` (\n  `created`,\n  `instanceId`\n)",
    "CREATE INDEX `idx_ueUQe1N` ON `invocations` (`uid`)"
  ]

  // add
  collection.schema.addField(new SchemaField({
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
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("aiw8te7y7atklwn")

  collection.indexes = [
    "CREATE INDEX `idx_CTV52b6` ON `invocations` (`created`)",
    "CREATE INDEX `idx_6rNZeTK` ON `invocations` (`instanceId`)",
    "CREATE INDEX `idx_LTmqfbC` ON `invocations` (`totalSeconds`)",
    "CREATE INDEX `idx_7YR9a3g` ON `invocations` (\n  `instanceId`,\n  `created`\n)",
    "CREATE INDEX `idx_ntC1d1L` ON `invocations` (\n  `totalSeconds`,\n  `created`\n)",
    "CREATE INDEX `idx_vViR75E` ON `invocations` (\n  `created`,\n  `totalSeconds`\n)",
    "CREATE INDEX `idx_q9LanEj` ON `invocations` (\n  `created`,\n  `instanceId`\n)"
  ]

  // remove
  collection.schema.removeField("kmyokg1d")

  return dao.saveCollection(collection)
})
