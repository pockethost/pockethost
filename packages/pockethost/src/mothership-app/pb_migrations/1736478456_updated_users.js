/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("systemprofiles0")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "u4ckg6um",
    "name": "subscription_quantity",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("systemprofiles0")

  // remove
  collection.schema.removeField("u4ckg6um")

  return dao.saveCollection(collection)
})
