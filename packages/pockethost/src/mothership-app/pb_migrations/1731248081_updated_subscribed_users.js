/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('s00x84jumfjcuvc')

    // remove
    collection.schema.removeField('nxduzx8j')

    // remove
    collection.schema.removeField('uxypjefe')

    // remove
    collection.schema.removeField('2eksisrf')

    // remove
    collection.schema.removeField('9vsfyoqa')

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'kij3qt2u',
        name: 'username',
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

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'cwdyzhim',
        name: 'email',
        type: 'email',
        required: false,
        presentable: false,
        unique: false,
        options: {
          exceptDomains: null,
          onlyDomains: null,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'ou52evzg',
        name: 'subscription',
        type: 'select',
        required: true,
        presentable: false,
        unique: false,
        options: {
          maxSelect: 1,
          values: ['free', 'premium', 'founder', 'flounder', 'legacy'],
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'shuxbcrz',
        name: 'subscription_interval',
        type: 'select',
        required: false,
        presentable: false,
        unique: false,
        options: {
          maxSelect: 1,
          values: ['month', 'year', 'life'],
        },
      })
    )

    return dao.saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('s00x84jumfjcuvc')

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'nxduzx8j',
        name: 'username',
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

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'uxypjefe',
        name: 'email',
        type: 'email',
        required: false,
        presentable: false,
        unique: false,
        options: {
          exceptDomains: null,
          onlyDomains: null,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '2eksisrf',
        name: 'subscription',
        type: 'select',
        required: true,
        presentable: false,
        unique: false,
        options: {
          maxSelect: 1,
          values: ['free', 'premium', 'lifetime', 'founder', 'legacy'],
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '9vsfyoqa',
        name: 'subscription_interval',
        type: 'select',
        required: false,
        presentable: false,
        unique: false,
        options: {
          maxSelect: 1,
          values: ['month', 'year', 'life'],
        },
      })
    )

    // remove
    collection.schema.removeField('kij3qt2u')

    // remove
    collection.schema.removeField('cwdyzhim')

    // remove
    collection.schema.removeField('ou52evzg')

    // remove
    collection.schema.removeField('shuxbcrz')

    return dao.saveCollection(collection)
  }
)
