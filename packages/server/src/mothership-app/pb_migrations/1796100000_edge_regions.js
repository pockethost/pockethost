/// <reference path="../pb_data/types.d.ts" />
// Customers see which region their instance runs in, and nothing else about the fleet. `edges` (internal_url, status,
// stats, last_seen) and `regions` stay superuser-only; `regions` was public until now, and only the mothership's own
// code ($app, which ignores rules) reads it. `edge_regions` is the customer-facing view: each edge's record id with
// its region's slug, name and country (ISO 3166-1 alpha-2, for a flag), for signed-in users. The dashboard matches it
// to instances.edge (visible to an instance's owners).
// Views send no realtime events: the dashboard loads this once and refetches when an instance names an edge it hasn't
// seen. Nothing runs per record read.
migrate(
  (app) => {
    const regions = app.findCollectionByNameOrId('regions')
    regions.listRule = null
    regions.viewRule = null
    app.save(regions)

    const view = new Collection({
      id: 'pbc_edgeregions1',
      name: 'edge_regions',
      type: 'view',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      viewQuery:
        'SELECT edges.id AS id, regions.id AS region, regions.name AS name, regions.country AS country ' +
        'FROM edges JOIN regions ON regions.id = edges.region',
    })
    app.save(view)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('edge_regions'))
    const regions = app.findCollectionByNameOrId('regions')
    regions.listRule = ''
    regions.viewRule = ''
    app.save(regions)
  }
)
