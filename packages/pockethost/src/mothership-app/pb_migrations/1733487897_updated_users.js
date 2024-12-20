/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("systemprofiles0")

  collection.indexes = [
    "CREATE INDEX `idx_dVbmhXb` ON `users` (`subscription`)",
    "CREATE INDEX `idx_3BXGFzv` ON `users` (`double_verified`)",
    "CREATE INDEX `idx_vBLE6dl` ON `users` (`suspension`)"
  ]

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "konhuwum",
    "name": "double_verified",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("systemprofiles0")

  collection.indexes = [
    "CREATE INDEX `idx_dVbmhXb` ON `users` (`subscription`)"
  ]

  // remove
  collection.schema.removeField("konhuwum")

  return dao.saveCollection(collection)
})
