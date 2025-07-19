/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('systemprofiles0')

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'we768a9l',
        name: 'suspension',
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
    const collection = dao.findCollectionByNameOrId('systemprofiles0')

    // remove
    collection.schema.removeField('we768a9l')

    return dao.saveCollection(collection)
  }
)
