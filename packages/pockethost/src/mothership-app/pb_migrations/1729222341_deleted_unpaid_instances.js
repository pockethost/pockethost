/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('1xetiik3maqvihl')

    return dao.deleteCollection(collection)
  },
  (db) => {
    const collection = new Collection({
      id: '1xetiik3maqvihl',
      created: '2024-07-03 22:26:16.959Z',
      updated: '2024-07-27 15:00:01.887Z',
      name: 'unpaid_instances',
      type: 'view',
      system: false,
      schema: [
        {
          system: false,
          id: 'f8nl2huf',
          name: 'uid',
          type: 'relation',
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: 'systemprofiles0',
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1,
            displayFields: null,
          },
        },
        {
          system: false,
          id: 'fvdiv6cs',
          name: 'subdomain',
          type: 'text',
          required: true,
          presentable: true,
          unique: false,
          options: {
            min: null,
            max: 50,
            pattern: '^[a-z][a-z0-9-]{2,39}$',
          },
        },
        {
          system: false,
          id: '3akaknyp',
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
          'select instances.id, uid, subdomain, suspension, instances.updated from instances join verified_users vu where vu.id = uid and (vu.subscription="free" or vu.subscription = "legacy")',
      },
    })

    return Dao(db).saveCollection(collection)
  }
)
