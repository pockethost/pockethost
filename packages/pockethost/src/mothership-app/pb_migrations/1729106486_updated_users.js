/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('systemprofiles0')

    collection.indexes = ['CREATE INDEX `idx_dVbmhXb` ON `users` (`subscription`)']

    return dao.saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('systemprofiles0')

    collection.indexes = []

    return dao.saveCollection(collection)
  }
)
