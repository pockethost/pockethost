/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('4jyrkxcora6bl8r')

    return dao.deleteCollection(collection)
  },
  (db) => {
    const collection = new Collection({
      id: '4jyrkxcora6bl8r',
      created: '2023-12-24 03:51:53.315Z',
      updated: '2024-10-12 22:53:33.717Z',
      name: 'legacy_users',
      type: 'view',
      system: false,
      schema: [
        {
          system: false,
          id: '8jht2ome',
          name: 'email',
          type: 'email',
          required: false,
          presentable: false,
          unique: false,
          options: {
            exceptDomains: null,
            onlyDomains: null,
          },
        },
        {
          system: false,
          id: '8whql8c9',
          name: 'isFounder',
          type: 'bool',
          required: false,
          presentable: false,
          unique: false,
          options: {},
        },
        {
          system: false,
          id: 'fftixxya',
          name: 'subscription',
          type: 'select',
          required: true,
          presentable: false,
          unique: false,
          options: {
            maxSelect: 1,
            values: ['free', 'premium', 'lifetime', 'founder', 'legacy'],
          },
        },
      ],
      indexes: [],
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      options: {
        query:
          'select u.id, u.email,u.isFounder,u.subscription,u.created,u.updated from verified_users u where u.isLegacy=1',
      },
    })

    return Dao(db).saveCollection(collection)
  }
)
