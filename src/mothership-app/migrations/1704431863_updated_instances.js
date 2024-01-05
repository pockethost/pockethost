/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("etae8tuiaxl6xfv")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "rofy4mta",
    "name": "notifyMaintenanceMode",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

   const res = dao.saveCollection(collection)

   db.newQuery(`update instances set notifyMaintenanceMode=1`).execute()

   return res

}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("etae8tuiaxl6xfv")

  // remove
  collection.schema.removeField("rofy4mta")

  return dao.saveCollection(collection)
})
