/// <reference path="../src/types/types.d.ts" />
migrate(
  (db) => {
    const collection = new Collection({
      id: 'n4sshkeys9v1k2m',
      created: '2026-06-13 12:00:00.000Z',
      updated: '2026-06-13 12:00:00.000Z',
      name: 'ssh_keys',
      type: 'base',
      system: false,
      schema: [
        {
          system: false,
          id: 'skuser01',
          name: 'user',
          type: 'relation',
          required: true,
          presentable: false,
          unique: false,
          options: {
            collectionId: 'systemprofiles0',
            cascadeDelete: true,
            minSelect: null,
            maxSelect: 1,
            displayFields: ['email'],
          },
        },
        {
          system: false,
          id: 'sklabel1',
          name: 'label',
          type: 'text',
          required: true,
          presentable: true,
          unique: false,
          options: {
            min: 1,
            max: 100,
            pattern: '',
          },
        },
        {
          system: false,
          id: 'skpubkey',
          name: 'public_key',
          type: 'text',
          required: true,
          presentable: false,
          unique: false,
          options: {
            min: 40,
            max: 500,
            pattern: '^ssh-ed25519 ',
          },
        },
        {
          system: false,
          id: 'skfprint',
          name: 'fingerprint',
          type: 'text',
          required: true,
          presentable: false,
          unique: false,
          options: {
            min: 10,
            max: 100,
            pattern: '^SHA256:',
          },
        },
        {
          system: false,
          id: 'skallins',
          name: 'all_instances',
          type: 'bool',
          required: false,
          presentable: false,
          unique: false,
          options: {},
        },
        {
          system: false,
          id: 'skinstds',
          name: 'instances',
          type: 'relation',
          required: false,
          presentable: false,
          unique: false,
          options: {
            collectionId: 'etae8tuiaxl6xfv',
            cascadeDelete: false,
            minSelect: null,
            maxSelect: null,
            displayFields: ['subdomain'],
          },
        },
      ],
      indexes: [
        'CREATE INDEX `idx_ssh_keys_user` ON `ssh_keys` (`user`)',
        'CREATE INDEX `idx_ssh_keys_fingerprint` ON `ssh_keys` (`fingerprint`)',
        'CREATE UNIQUE INDEX `idx_ssh_keys_user_fingerprint` ON `ssh_keys` (`user`, `fingerprint`)',
      ],
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
      options: {},
    })

    return Dao(db).saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('n4sshkeys9v1k2m')

    return dao.deleteCollection(collection)
  }
)
