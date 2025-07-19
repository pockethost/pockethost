/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('s00x84jumfjcuvc')

    // remove
    collection.schema.removeField('kij3qt2u')

    // remove
    collection.schema.removeField('cwdyzhim')

    // remove
    collection.schema.removeField('ou52evzg')

    // remove
    collection.schema.removeField('shuxbcrz')

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'h4ghvr0j',
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
        id: 'xsw6d7vd',
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
        id: 'fpeo0wzq',
        name: 'subscription',
        type: 'select',
        required: true,
        presentable: false,
        unique: false,
        options: {
          maxSelect: 1,
          values: ['free', 'unpaid', 'premium', 'founder', 'flounder', 'legacy'],
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'rloy8p0i',
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

    // remove
    collection.schema.removeField('h4ghvr0j')

    // remove
    collection.schema.removeField('xsw6d7vd')

    // remove
    collection.schema.removeField('fpeo0wzq')

    // remove
    collection.schema.removeField('rloy8p0i')

    return dao.saveCollection(collection)
  }
)
