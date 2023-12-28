/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("etae8tuiaxl6xfv")

  collection.indexes = [
    "CREATE UNIQUE INDEX `idx_unique_qdtuuld1` ON `instances` (`subdomain`)",
    "CREATE INDEX `idx_DKUSkMx` ON `instances` (`status`)",
    "CREATE INDEX `idx_fhfKrpl` ON `instances` (`uid`)",
    "CREATE INDEX `idx_TfdgNnO` ON `instances` (`maintenance`)",
    "CREATE INDEX `idx_FrmHehp` ON `instances` (`created`)",
    "CREATE INDEX `idx_tNMeylJ` ON `instances` (`updated`)",
    "CREATE INDEX `idx_rBYwAXi` ON `instances` (`cname`)"
  ]

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "untde8eo",
    "name": "cname",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("etae8tuiaxl6xfv")

  collection.indexes = [
    "CREATE UNIQUE INDEX `idx_unique_qdtuuld1` ON `instances` (`subdomain`)",
    "CREATE INDEX `idx_DKUSkMx` ON `instances` (`status`)",
    "CREATE INDEX `idx_fhfKrpl` ON `instances` (`uid`)",
    "CREATE INDEX `idx_TfdgNnO` ON `instances` (`maintenance`)",
    "CREATE INDEX `idx_FrmHehp` ON `instances` (`created`)",
    "CREATE INDEX `idx_tNMeylJ` ON `instances` (`updated`)"
  ]

  // remove
  collection.schema.removeField("untde8eo")

  return dao.saveCollection(collection)
})
