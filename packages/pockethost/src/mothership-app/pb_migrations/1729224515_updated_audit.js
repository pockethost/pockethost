/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('hsuwe2h3csch1yr')

    // update
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '3frdgrxe',
        name: 'user',
        type: 'relation',
        required: false,
        presentable: false,
        unique: false,
        options: {
          collectionId: 'systemprofiles0',
          cascadeDelete: true,
          minSelect: null,
          maxSelect: 1,
          displayFields: null,
        },
      })
    )

    return dao.saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('hsuwe2h3csch1yr')

    // update
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '3frdgrxe',
        name: 'user',
        type: 'relation',
        required: false,
        presentable: false,
        unique: false,
        options: {
          collectionId: 'systemprofiles0',
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: null,
        },
      })
    )

    return dao.saveCollection(collection)
  }
)
