/// <reference path="../pb_data/types.d.ts" />
// Personal access tokens (see common/pat.ts) and the deploy history written by the edge deploy API.
// Tokens are created only through POST /api/tokens, so the secret is always generated server-side.
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
    const num = (id, name) => ({
      ...base,
      id,
      max: null,
      min: 0,
      name,
      onlyInt: true,
      required: false,
      type: 'number',
    })
    const date = (id, name) => ({ ...base, id, max: '', min: '', name, required: false, type: 'date' })
    const idField = {
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
    }
    const autodates = [
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
    ]
    const userRel = (id) => ({
      ...base,
      cascadeDelete: true,
      collectionId: 'systemprofiles0',
      id,
      maxSelect: 1,
      minSelect: 0,
      name: 'user',
      required: true,
      type: 'relation',
    })

    app.save(
      new Collection({
        id: 'apitokens000001',
        name: 'api_tokens',
        type: 'base',
        system: false,
        fields: [
          idField,
          userRel('at1user001'),
          text('at1label01', 'label', { required: true, presentable: true, min: 1, max: 100 }),
          text('at1hash001', 'secret_hash', { required: true, hidden: true, max: 64 }),
          text('at1hint001', 'hint', { max: 8 }),
          {
            ...base,
            id: 'at1scope01',
            maxSelect: 2,
            name: 'scopes',
            required: true,
            type: 'select',
            values: ['read', 'write'],
          },
          { ...base, id: 'at1allins1', name: 'all_instances', required: false, type: 'bool' },
          {
            ...base,
            cascadeDelete: false,
            collectionId: 'etae8tuiaxl6xfv',
            id: 'at1insts01',
            maxSelect: 999,
            minSelect: 0,
            name: 'instances',
            required: false,
            type: 'relation',
          },
          date('at1expir01', 'expires'),
          date('at1lused01', 'last_used'),
          text('at1lusip01', 'last_used_ip', { max: 64 }),
          ...autodates,
        ],
        indexes: ['CREATE INDEX `idx_api_tokens_user` ON `api_tokens` (`user`)'],
        listRule: 'user = @request.auth.id',
        viewRule: 'user = @request.auth.id',
        createRule: null,
        updateRule: null,
        deleteRule: 'user = @request.auth.id',
      })
    )

    app.save(
      new Collection({
        id: 'deploys00000001',
        name: 'deploys',
        type: 'base',
        system: false,
        fields: [
          idField,
          {
            ...base,
            cascadeDelete: true,
            collectionId: 'etae8tuiaxl6xfv',
            id: 'dp1inst001',
            maxSelect: 1,
            minSelect: 0,
            name: 'instance',
            required: true,
            type: 'relation',
          },
          userRel('dp1user001'),
          {
            ...base,
            id: 'dp1status1',
            maxSelect: 1,
            name: 'status',
            required: true,
            type: 'select',
            values: ['success', 'failed'],
          },
          num('dp1files01', 'file_count'),
          num('dp1upcnt01', 'uploaded_count'),
          num('dp1upbyt01', 'uploaded_bytes'),
          num('dp1totby01', 'total_bytes'),
          text('dp1commit1', 'commit', { max: 100 }),
          text('dp1msg0001', 'message', { max: 500 }),
          text('dp1source1', 'source', { max: 100 }),
          text('dp1toklab1', 'token_label', { max: 100 }),
          text('dp1error01', 'error', { max: 2000 }),
          ...autodates,
        ],
        indexes: ['CREATE INDEX `idx_deploys_instance_created` ON `deploys` (`instance`, `created`)'],
        listRule: 'instance.uid = @request.auth.id',
        viewRule: 'instance.uid = @request.auth.id',
        createRule: null,
        updateRule: null,
        deleteRule: null,
      })
    )
  },
  (app) => {
    for (const name of ['deploys', 'api_tokens']) {
      app.delete(app.findCollectionByNameOrId(name))
    }
  }
)
