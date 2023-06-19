migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('aiw8te7y7atklwn')

    collection.indexes = [
      'CREATE INDEX `idx_CTV52b6` ON `invocations` (`created`)',
      'CREATE INDEX `idx_6rNZeTK` ON `invocations` (`instanceId`)',
      'CREATE INDEX `idx_LTmqfbC` ON `invocations` (`totalSeconds`)',
      'CREATE INDEX `idx_7YR9a3g` ON `invocations` (\n  `instanceId`,\n  `created`\n)',
      'CREATE INDEX `idx_ntC1d1L` ON `invocations` (\n  `totalSeconds`,\n  `created`\n)',
      'CREATE INDEX `idx_vViR75E` ON `invocations` (\n  `created`,\n  `totalSeconds`\n)',
      'CREATE INDEX `idx_q9LanEj` ON `invocations` (\n  `created`,\n  `instanceId`\n)',
    ]

    return dao.saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('aiw8te7y7atklwn')

    collection.indexes = []

    return dao.saveCollection(collection)
  }
)
