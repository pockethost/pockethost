/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('users')
    collection.fields.getByName('email').presentable = true
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('users')
    collection.fields.getByName('email').presentable = false
    app.save(collection)
  }
)
