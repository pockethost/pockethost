/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('4kshuv7r3jdrst4')

    collection.options = {
      query:
        'select id, username, email, subscription, subscription_interval, tokenKey, passwordHash, unsubscribe, created, updated from users where verified = 1',
    }

    // remove
    collection.schema.removeField('d1ih2lys')

    // remove
    collection.schema.removeField('a2lkatzz')

    // remove
    collection.schema.removeField('rrnexgam')

    // remove
    collection.schema.removeField('nw92xw4d')

    // remove
    collection.schema.removeField('wdvo6qe5')

    // remove
    collection.schema.removeField('exomhe8e')

    // remove
    collection.schema.removeField('kvuurum5')

    // remove
    collection.schema.removeField('z14fromd')

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'fec2cbfb',
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
        id: 'tytnadtb',
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
        id: 'juickogz',
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
        id: 'e5tbaqub',
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

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'lzoyncmi',
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
        id: 'p5hwwwd1',
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

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'mswqajfw',
        name: 'unsubscribe',
        type: 'bool',
        required: false,
        presentable: false,
        unique: false,
        options: {},
      })
    )

    return dao.saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('4kshuv7r3jdrst4')

    collection.options = {
      query:
        'select id, username, email, subscription, subscription_interval, isLegacy,  tokenKey, passwordHash, unsubscribe, created, updated from users where verified = 1',
    }

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'd1ih2lys',
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
        id: 'a2lkatzz',
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
        id: 'rrnexgam',
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
        id: 'nw92xw4d',
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

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'wdvo6qe5',
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
        id: 'exomhe8e',
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
        id: 'kvuurum5',
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

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'z14fromd',
        name: 'unsubscribe',
        type: 'bool',
        required: false,
        presentable: false,
        unique: false,
        options: {},
      })
    )

    // remove
    collection.schema.removeField('fec2cbfb')

    // remove
    collection.schema.removeField('tytnadtb')

    // remove
    collection.schema.removeField('juickogz')

    // remove
    collection.schema.removeField('e5tbaqub')

    // remove
    collection.schema.removeField('lzoyncmi')

    // remove
    collection.schema.removeField('p5hwwwd1')

    // remove
    collection.schema.removeField('mswqajfw')

    return dao.saveCollection(collection)
  }
)
