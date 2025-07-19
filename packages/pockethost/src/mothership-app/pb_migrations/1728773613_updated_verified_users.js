/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('4kshuv7r3jdrst4')

    // remove
    collection.schema.removeField('j4oyvsxw')

    // remove
    collection.schema.removeField('rz3ufbgh')

    // remove
    collection.schema.removeField('0cawpmvr')

    // remove
    collection.schema.removeField('alj2bzt5')

    // remove
    collection.schema.removeField('ipcbnqvm')

    // remove
    collection.schema.removeField('qhhovz76')

    // remove
    collection.schema.removeField('qwrt00fr')

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'adw77j4s',
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
        id: 'wxps0qm4',
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
        id: 'cxtdf1is',
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
        id: 'opzsczua',
        name: 'isLegacy',
        type: 'bool',
        required: false,
        presentable: false,
        unique: false,
        options: {},
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'noac3js4',
        name: 'isFounder',
        type: 'bool',
        required: false,
        presentable: false,
        unique: false,
        options: {},
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'zexzaoc9',
        name: 'tokenKey',
        type: 'json',
        required: false,
        presentable: false,
        unique: false,
        options: {
          maxSize: 1,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '1ggewfpm',
        name: 'passwordHash',
        type: 'json',
        required: false,
        presentable: false,
        unique: false,
        options: {
          maxSize: 1,
        },
      })
    )

    return dao.saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('4kshuv7r3jdrst4')

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'j4oyvsxw',
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
        id: 'rz3ufbgh',
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
        id: '0cawpmvr',
        name: 'subscription',
        type: 'select',
        required: true,
        presentable: false,
        unique: false,
        options: {
          maxSelect: 1,
          values: ['free', 'premium', 'lifetime', 'legacy'],
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'alj2bzt5',
        name: 'isLegacy',
        type: 'bool',
        required: false,
        presentable: false,
        unique: false,
        options: {},
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'ipcbnqvm',
        name: 'isFounder',
        type: 'bool',
        required: false,
        presentable: false,
        unique: false,
        options: {},
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'qhhovz76',
        name: 'tokenKey',
        type: 'json',
        required: false,
        presentable: false,
        unique: false,
        options: {
          maxSize: 1,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'qwrt00fr',
        name: 'passwordHash',
        type: 'json',
        required: false,
        presentable: false,
        unique: false,
        options: {
          maxSize: 1,
        },
      })
    )

    // remove
    collection.schema.removeField('adw77j4s')

    // remove
    collection.schema.removeField('wxps0qm4')

    // remove
    collection.schema.removeField('cxtdf1is')

    // remove
    collection.schema.removeField('opzsczua')

    // remove
    collection.schema.removeField('noac3js4')

    // remove
    collection.schema.removeField('zexzaoc9')

    // remove
    collection.schema.removeField('1ggewfpm')

    return dao.saveCollection(collection)
  }
)
