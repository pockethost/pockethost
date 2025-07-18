/// <reference path="../src/types/types.d.ts" />
migrate(
  (db) => {
    const collection = new Collection({
      id: 'jw1wz9nmkvnhcm6',
      created: '2025-07-18 05:18:37.698Z',
      updated: '2025-07-18 05:18:37.698Z',
      name: 'domains',
      type: 'base',
      system: false,
      schema: [
        {
          system: false,
          id: 'fhie5snn',
          name: 'instance',
          type: 'relation',
          required: false,
          presentable: false,
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
          id: 'wn3oncif',
          name: 'domain',
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
          id: 'vzkcvhhg',
          name: 'active',
          type: 'bool',
          required: false,
          presentable: false,
          unique: false,
          options: {},
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX `idx_gtGcwf2` ON `domains` (`domain`)',
        'CREATE INDEX `idx_OtPOwXe` ON `domains` (`instance`)',
        'CREATE INDEX `idx_0omsTdi` ON `domains` (`created`)',
        'CREATE INDEX `idx_uMaIOVQ` ON `domains` (`updated`)',
        'CREATE UNIQUE INDEX `idx_VLBOSap` ON `domains` (\n  `instance`,\n  `domain`\n)',
      ],
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      options: {},
    })

    return Dao(db).saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('jw1wz9nmkvnhcm6')

    return dao.deleteCollection(collection)
  },
)
