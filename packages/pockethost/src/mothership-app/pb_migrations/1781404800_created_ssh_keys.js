/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const base = { hidden: false, presentable: false, system: false }
    const text = (id, name, extra = {}) => ({
      ...base,
      autogeneratePattern: '',
      id,
      max: 0,
      min: 0,
      name,
      pattern: '',
      primaryKey: false,
      required: false,
      type: 'text',
      ...extra,
    })

    app.save(
      new Collection({
        id: 'n4sshkeys9v1k2m',
        name: 'ssh_keys',
        type: 'base',
        system: false,
        fields: [
          {
            autogeneratePattern: '[a-z0-9]{15}',
            hidden: false,
            id: 'text3208210256',
            max: 15,
            min: 15,
            name: 'id',
            pattern: '^[a-z0-9]+$',
            presentable: false,
            primaryKey: true,
            required: true,
            system: true,
            type: 'text',
          },
          {
            ...base,
            cascadeDelete: true,
            collectionId: 'systemprofiles0',
            id: 'skuser01',
            maxSelect: 1,
            minSelect: 0,
            name: 'user',
            required: true,
            type: 'relation',
          },
          text('sklabel1', 'label', { required: true, presentable: true, min: 1, max: 100 }),
          text('skpubkey', 'public_key', { required: true, min: 40, max: 500, pattern: '^ssh-ed25519 ' }),
          text('skfprint', 'fingerprint', { required: true, min: 10, max: 100, pattern: '^SHA256:' }),
          { ...base, id: 'skallins', name: 'all_instances', required: false, type: 'bool' },
          {
            ...base,
            cascadeDelete: false,
            collectionId: 'etae8tuiaxl6xfv',
            id: 'skinstds',
            maxSelect: 2147483647,
            minSelect: 0,
            name: 'instances',
            required: false,
            type: 'relation',
          },
          {
            ...base,
            id: 'autodate2990389176',
            name: 'created',
            onCreate: true,
            onUpdate: false,
            type: 'autodate',
          },
          {
            ...base,
            id: 'autodate3332085495',
            name: 'updated',
            onCreate: true,
            onUpdate: true,
            type: 'autodate',
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
      })
    )
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('n4sshkeys9v1k2m'))
  }
)
