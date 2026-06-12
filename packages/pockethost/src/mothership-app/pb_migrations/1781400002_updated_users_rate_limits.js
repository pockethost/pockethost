/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('systemprofiles0')

    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'usratelm',
        name: 'rate_limits',
        type: 'json',
        required: false,
        presentable: false,
        unique: false,
        options: {
          maxSize: 2000000,
        },
      })
    )

    return dao.saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('systemprofiles0')

    collection.schema.removeField('usratelm')

    return dao.saveCollection(collection)
  }
)
