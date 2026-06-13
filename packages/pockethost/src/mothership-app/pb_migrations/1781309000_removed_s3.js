/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const instances = dao.findCollectionByNameOrId('etae8tuiaxl6xfv')

    instances.schema.removeField('k7nxxzdr')
    dao.saveCollection(instances)

    const s3 = dao.findCollectionByNameOrId('7n6rny9w7n52mvi')
    dao.deleteCollection(s3)
  },
  (db) => {
    const dao = new Dao(db)

    const collection = new Collection({
      id: '7n6rny9w7n52mvi',
      name: 's3',
      type: 'base',
      system: false,
      schema: [
        {
          system: false,
          id: 'yvy0exvk',
          name: 'instance',
          type: 'relation',
          required: false,
          presentable: true,
          unique: false,
          options: {
            collectionId: 'etae8tuiaxl6xfv',
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1,
            displayFields: null,
          },
        },
        {
          system: false,
          id: 'kz6u1z1p',
          name: 'endpoint',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: null,
            max: null,
            pattern: '',
          },
        },
        {
          system: false,
          id: 'etcgfvgc',
          name: 'access_key',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: null,
            max: null,
            pattern: '',
          },
        },
        {
          system: false,
          id: 'fn8ulajr',
          name: 'secret',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: null,
            max: null,
            pattern: '',
          },
        },
        {
          system: false,
          id: 'kktzqpxi',
          name: 'bucket',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: null,
            max: null,
            pattern: '',
          },
        },
        {
          system: false,
          id: 'fysmrb1v',
          name: 'region',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: {
            min: null,
            max: null,
            pattern: '',
          },
        },
      ],
      indexes: [],
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      options: {},
    })

    dao.saveCollection(collection)

    const instances = dao.findCollectionByNameOrId('etae8tuiaxl6xfv')
    instances.schema.addField(
      new SchemaField({
        system: false,
        id: 'k7nxxzdr',
        name: 's3',
        type: 'relation',
        required: false,
        presentable: false,
        unique: false,
        options: {
          collectionId: '7n6rny9w7n52mvi',
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: null,
        },
      })
    )
    dao.saveCollection(instances)
  }
)
