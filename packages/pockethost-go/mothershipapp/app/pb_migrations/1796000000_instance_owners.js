/// <reference path="../pb_data/types.d.ts" />
// Ownership leaves the instance row (pocketbrain plans/instances-without-users.md step 2): `instance_owners` holds who
// owns an instance and whether their login is synced into it as a superuser (`sync_login`, was `instances.syncAdmin`).
// One owner per instance for now (unique `instance`). The rows are copied from `instances.uid` / `syncAdmin`, then the
// `stats` view and the instances access rules go through the new table, and both columns (and the `uid` index) go.
// Deleting a user still deletes their instances: the mothership's Go does it (mothership_owners.go), since a
// relation's cascade would only delete the owner row.
const INSTANCES = 'etae8tuiaxl6xfv'
const USERS = 'systemprofiles0'
const OWNERS = 'pbc_instowners01'
const OWNER_RULE = 'instance_owners_via_instance.user ?= @request.auth.id'
const UID_INDEX = 'CREATE INDEX `idx_fhfKrpl` ON `instances` (`uid`)'
const STATS_JOIN_OLD = 'LEFT JOIN\n    instances ON users.id = instances.uid'
const STATS_JOIN_NEW =
  'LEFT JOIN\n    instance_owners ON users.id = instance_owners.user\nLEFT JOIN\n    instances ON instances.id = instance_owners.instance'

migrate(
  (app) => {
    const owners = new Collection({
      id: OWNERS,
      name: 'instance_owners',
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
          collectionId: INSTANCES,
          hidden: false,
          id: 'instown_inst',
          maxSelect: 1,
          minSelect: 0,
          name: 'instance',
          presentable: false,
          required: true,
          system: false,
          type: 'relation',
        },
        {
          cascadeDelete: true,
          collectionId: USERS,
          hidden: false,
          id: 'instown_user',
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
          id: 'instown_sync',
          name: 'sync_login',
          presentable: false,
          required: false,
          system: false,
          type: 'bool',
        },
        {
          hidden: false,
          id: 'instown_created',
          name: 'created',
          onCreate: true,
          onUpdate: false,
          presentable: false,
          system: false,
          type: 'autodate',
        },
        {
          hidden: false,
          id: 'instown_updated',
          name: 'updated',
          onCreate: true,
          onUpdate: true,
          presentable: false,
          system: false,
          type: 'autodate',
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX `idx_instance_owners_instance` ON `instance_owners` (`instance`)',
        'CREATE INDEX `idx_instance_owners_user` ON `instance_owners` (`user`)',
      ],
    })
    app.save(owners)

    // one row per owned instance; ids made like PocketBase's (15 of [a-z0-9])
    app
      .db()
      .newQuery(
        `INSERT INTO instance_owners (id, instance, user, sync_login, created, updated)
         SELECT substr(lower(hex(randomblob(8))), 1, 15), i.id, i.uid, COALESCE(i.syncAdmin, 0),
                strftime('%Y-%m-%d %H:%M:%fZ', 'now'), strftime('%Y-%m-%d %H:%M:%fZ', 'now')
         FROM instances i WHERE i.uid != '' AND i.uid IN (SELECT id FROM users)`
      )
      .execute()

    const stats = app.findCollectionByNameOrId('stats')
    if (stats.viewQuery.includes(STATS_JOIN_OLD)) {
      stats.viewQuery = stats.viewQuery.replace(STATS_JOIN_OLD, STATS_JOIN_NEW)
      app.save(stats)
    }

    const instances = app.findCollectionByNameOrId(INSTANCES)
    instances.listRule = OWNER_RULE
    instances.viewRule = OWNER_RULE
    instances.indexes = instances.indexes.filter((ix) => !ix.includes('(`uid`)'))
    instances.fields.removeByName('uid')
    instances.fields.removeByName('syncAdmin')
    app.save(instances)
  },
  (app) => {
    const instances = app.findCollectionByNameOrId(INSTANCES)
    instances.fields.add(
      new Field({
        cascadeDelete: true,
        collectionId: USERS,
        hidden: false,
        id: 'rbj14krn',
        maxSelect: 1,
        minSelect: 0,
        name: 'uid',
        presentable: false,
        required: false,
        system: false,
        type: 'relation',
      })
    )
    instances.fields.add(
      new Field({
        hidden: false,
        id: 'hkt4q8yk',
        name: 'syncAdmin',
        presentable: false,
        required: false,
        system: false,
        type: 'bool',
      })
    )
    instances.indexes = [...instances.indexes, UID_INDEX]
    instances.listRule = 'uid=@request.auth.id'
    instances.viewRule = 'uid = @request.auth.id'
    app.save(instances)
    app
      .db()
      .newQuery(
        `UPDATE instances SET uid = o.user, syncAdmin = o.sync_login
         FROM instance_owners o WHERE o.instance = instances.id`
      )
      .execute()
    const stats = app.findCollectionByNameOrId('stats')
    if (stats.viewQuery.includes(STATS_JOIN_NEW)) {
      stats.viewQuery = stats.viewQuery.replace(STATS_JOIN_NEW, STATS_JOIN_OLD)
      app.save(stats)
    }
    app.delete(app.findCollectionByNameOrId(OWNERS))
  }
)
