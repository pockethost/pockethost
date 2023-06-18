migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("v7s41iokt1vizxd")

  collection.createRule = "userId = @request.auth.id && status='' && result=''"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("v7s41iokt1vizxd")

  collection.createRule = null

  return dao.saveCollection(collection)
})
