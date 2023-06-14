migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("etae8tuiaxl6xfv")

  collection.indexes = [
    "CREATE UNIQUE INDEX `idx_unique_qdtuuld1` ON `instances` (`subdomain`)"
  ]

  // remove
  collection.schema.removeField("yxby5r6b")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "qdtuuld1",
    "name": "subdomain",
    "type": "text",
    "required": true,
    "unique": false,
    "options": {
      "min": null,
      "max": 50,
      "pattern": "^[a-z][\\-a-z]+$"
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("etae8tuiaxl6xfv")

  collection.indexes = [
    "CREATE UNIQUE INDEX \"idx_unique_qdtuuld1\" on \"instances\" (\"subdomain\")"
  ]

  // add
  collection.schema.addField(new SchemaField({
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
  }))

  // update
  collection.schema.addField(new SchemaField({
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
  }))

  return dao.saveCollection(collection)
})
