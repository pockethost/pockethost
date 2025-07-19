/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("jw1wz9nmkvnhcm6")

  collection.listRule = "@request.auth.id=instance.uid"
  collection.viewRule = "@request.auth.id=instance.uid"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("jw1wz9nmkvnhcm6")

  collection.listRule = null
  collection.viewRule = null

  return dao.saveCollection(collection)
})
