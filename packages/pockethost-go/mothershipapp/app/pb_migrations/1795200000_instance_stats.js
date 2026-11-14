/// <reference path="../pb_data/types.d.ts" />
// instance_stats: facts edges measure about the instances they serve (ext/lifecycle): disk used and the last request
// served. One row per instance, written by the edge that holds it. A separate collection, so a daily measurement
// doesn't touch `instances.updated` (which other jobs read). The mothership sums disk_bytes per owner into
// users.volume_storage_used.
migrate(
  (app) => {
    const instances = app.findCollectionByNameOrId('instances')
    const edges = app.findCollectionByNameOrId('edges')
    const stats = new Collection({
      id: 'pbc_inststats1',
      name: 'instance_stats',
      type: 'base',
      system: false,
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          id: 'text3208210256',
          name: 'id',
          type: 'text',
          primaryKey: true,
          system: true,
          required: true,
          min: 15,
          max: 15,
          pattern: '^[a-z0-9]+$',
          autogeneratePattern: '[a-z0-9]{15}',
          hidden: false,
          presentable: false,
        },
        {
          id: 'istinst001',
          name: 'instance',
          type: 'relation',
          collectionId: instances.id,
          maxSelect: 1,
          minSelect: 0,
          cascadeDelete: true,
          required: true,
          hidden: false,
          system: false,
          presentable: false,
        },
        {
          id: 'istedge001',
          name: 'edge',
          type: 'relation',
          collectionId: edges.id,
          maxSelect: 1,
          minSelect: 0,
          cascadeDelete: false,
          required: false,
          hidden: false,
          system: false,
          presentable: false,
        },
        { id: 'istdisk001', name: 'disk_bytes', type: 'number', required: false, onlyInt: true, min: 0 },
        { id: 'istmeas001', name: 'disk_measured', type: 'date', required: false },
        { id: 'istactv001', name: 'last_active', type: 'date', required: false },
        { id: 'istcreat01', name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { id: 'istupdat01', name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX `idx_instance_stats_instance` ON `instance_stats` (`instance`)'],
    })
    app.save(stats)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('instance_stats'))
  }
)
