/// <reference path="../pb_data/types.d.ts" />
// Bonus instances. Each grant is a row in `bonus_grants` (user, amount, source, note). Superusers add manual grants in
// the admin; the loyalty rules will add `loyalty` rows later. A hook keeps `users.bonus_instances` equal to the sum
// (floored at 0), and the instance allowance is paid + bonus while the account has at least one paid instance
// (common/instanceLimits.ts instanceAllowance). Customers can read their own grants (the dashboard shows the notes) but
// not change them.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(
      new Field({
        hidden: false,
        id: 'bnsinstnc',
        max: null,
        min: 0,
        name: 'bonus_instances',
        onlyInt: true,
        presentable: false,
        required: false,
        system: false,
        type: 'number',
      })
    )
    app.save(users)

    const grants = new Collection({
      id: 'pbc_bonusgrants',
      name: 'bonus_grants',
      type: 'base',
      system: false,
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: null,
      updateRule: null,
      deleteRule: null,
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
          cascadeDelete: true,
          collectionId: users.id,
          hidden: false,
          id: 'bgrntuser',
          maxSelect: 1,
          minSelect: 0,
          name: 'user',
          presentable: false,
          required: true,
          system: false,
          type: 'relation',
        },
        {
          hidden: false,
          id: 'bgrntamnt',
          max: 1000,
          min: -1000,
          name: 'amount',
          onlyInt: true,
          presentable: true,
          required: true,
          system: false,
          type: 'number',
        },
        {
          hidden: false,
          id: 'bgrntsrce',
          maxSelect: 1,
          name: 'source',
          presentable: false,
          required: true,
          system: false,
          type: 'select',
          values: ['manual', 'loyalty'],
        },
        {
          autogeneratePattern: '',
          hidden: false,
          id: 'bgrntnote',
          max: 500,
          min: 0,
          name: 'note',
          pattern: '',
          presentable: false,
          primaryKey: false,
          required: false,
          system: false,
          type: 'text',
        },
        {
          hidden: false,
          id: 'bgrntcrtd',
          name: 'created',
          onCreate: true,
          onUpdate: false,
          presentable: false,
          system: false,
          type: 'autodate',
        },
        {
          hidden: false,
          id: 'bgrntupdt',
          name: 'updated',
          onCreate: true,
          onUpdate: true,
          presentable: false,
          system: false,
          type: 'autodate',
        },
      ],
      indexes: ['CREATE INDEX `idx_bonus_grants_user` ON `bonus_grants` (`user`)'],
    })
    app.save(grants)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('bonus_grants'))
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeById('bnsinstnc')
    app.save(users)
  }
)
