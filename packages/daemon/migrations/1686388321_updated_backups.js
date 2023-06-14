migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("72clb6v41bzsay9")

  // remove
  collection.schema.removeField("4lmammjz")

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("72clb6v41bzsay9")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "4lmammjz",
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

  return dao.saveCollection(collection)
})
