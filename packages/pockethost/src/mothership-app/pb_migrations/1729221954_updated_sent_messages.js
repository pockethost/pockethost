/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('18rfmj8aklx6bjq')

    collection.indexes = ['CREATE UNIQUE INDEX `idx_tsm2mRA` ON `sent_messages` (\n  `user`,\n  `campaign_message`\n)']

    return dao.saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('18rfmj8aklx6bjq')

    collection.indexes = []

    return dao.saveCollection(collection)
  }
)
