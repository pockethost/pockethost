/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeById('usratelm')
    app.save(users)

    const instances = app.findCollectionByNameOrId('instances')
    instances.fields.removeById('fwtrstip')
    instances.fields.removeById('fwproxyip')
    instances.fields.removeById('fwratelmt')
    app.save(instances)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(
      new Field({
        help: '',
        hidden: false,
        id: 'usratelm',
        maxSize: 2000000,
        name: 'rate_limits',
        presentable: false,
        required: false,
        system: false,
        type: 'json',
      })
    )
    app.save(users)

    const instances = app.findCollectionByNameOrId('instances')
    instances.fields.add(
      new Field({
        help: '',
        hidden: false,
        id: 'fwtrstip',
        maxSize: 2000000,
        name: 'trusted_ips',
        presentable: false,
        required: false,
        system: false,
        type: 'json',
      })
    )
    instances.fields.add(
      new Field({
        help: '',
        hidden: false,
        id: 'fwproxyip',
        maxSize: 2000000,
        name: 'proxy_ips',
        presentable: false,
        required: false,
        system: false,
        type: 'json',
      })
    )
    instances.fields.add(
      new Field({
        help: '',
        hidden: false,
        id: 'fwratelmt',
        maxSize: 2000000,
        name: 'rate_limits',
        presentable: false,
        required: false,
        system: false,
        type: 'json',
      })
    )
    app.save(instances)
  }
)
