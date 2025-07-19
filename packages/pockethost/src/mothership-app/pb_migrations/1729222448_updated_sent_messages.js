/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('18rfmj8aklx6bjq')

    // remove
    collection.schema.removeField('yzvlcy7m')

    return dao.saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('18rfmj8aklx6bjq')

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'yzvlcy7m',
        name: 'message',
        type: 'text',
        required: true,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: '',
        },
      })
    )

    return dao.saveCollection(collection)
  }
)
