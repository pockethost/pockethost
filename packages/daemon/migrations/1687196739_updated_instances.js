migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('etae8tuiaxl6xfv')

    collection.indexes = [
      'CREATE UNIQUE INDEX `idx_unique_qdtuuld1` ON `instances` (`subdomain`)',
      'CREATE INDEX `idx_DKUSkMx` ON `instances` (`status`)',
    ]

    return dao.saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('etae8tuiaxl6xfv')

    collection.indexes = []

    return dao.saveCollection(collection)
  }
)
