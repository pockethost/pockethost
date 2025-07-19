/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('etae8tuiaxl6xfv')

    // remove
    collection.schema.removeField('1vrc1wfd')

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'kd017nrg',
        name: 'volume',
        type: 'text',
        required: false,
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
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('etae8tuiaxl6xfv')

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '1vrc1wfd',
        name: 'volume',
        type: 'select',
        required: false,
        presentable: false,
        unique: false,
        options: {
          maxSelect: 1,
          values: ['.', 'sfo-2-data'],
        },
      })
    )

    // remove
    collection.schema.removeField('kd017nrg')

    return dao.saveCollection(collection)
  }
)
