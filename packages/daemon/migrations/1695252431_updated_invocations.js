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
    "CREATE INDEX `idx_ueUQe1N` ON `invocations` (`uid`)",
    "CREATE INDEX `idx_gh6iEUG` ON `invocations` (\n  `instanceId`,\n  `startedAt`\n)",
    "CREATE INDEX `idx_CUsNbfu` ON `invocations` (\n  `uid`,\n  `startedAt`\n)",
    "CREATE INDEX `idx_O3bEfl0` ON `invocations` (`updated`)",
    "CREATE INDEX `idx_qOyDhVG` ON `invocations` (`created`)",
    "CREATE INDEX `idx_UM6cwSA` ON `invocations` (`instanceId`)",
    "CREATE INDEX `idx_nMr318s` ON `invocations` (`totalSeconds`)"
  ]

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
    "CREATE INDEX `idx_q9LanEj` ON `invocations` (\n  `created`,\n  `instanceId`\n)",
    "CREATE INDEX `idx_ueUQe1N` ON `invocations` (`uid`)",
    "CREATE INDEX `idx_gh6iEUG` ON `invocations` (\n  `instanceId`,\n  `startedAt`\n)",
    "CREATE INDEX `idx_CUsNbfu` ON `invocations` (\n  `uid`,\n  `startedAt`\n)"
  ]

  return dao.saveCollection(collection)
})
