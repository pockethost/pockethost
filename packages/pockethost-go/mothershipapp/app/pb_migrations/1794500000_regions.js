/// <reference path="../pb_data/types.d.ts" />
// Regions become a lookup table. A region record's id is its slug (`sfo`, `ams`, `sgp`), so `edges.region` (now a
// relation) stores the same strings edges already report in their heartbeat. Instances no longer carry a region:
// an instance has an edge, the edge is in a region. `country` is an ISO 3166-1 alpha-2 code (for a flag in the UI).
const SEED = [
  { id: 'sfo', name: 'San Francisco', country: 'US' },
  { id: 'ams', name: 'Amsterdam', country: 'NL' },
  { id: 'sgp', name: 'Singapore', country: 'SG' },
]

migrate(
  (app) => {
    const regions = new Collection({
      id: 'pbc_regions01',
      name: 'regions',
      type: 'base',
      system: false,
      listRule: '',
      viewRule: '',
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
          min: 2,
          max: 15,
          pattern: '^[a-z][a-z0-9-]*$',
          autogeneratePattern: '',
          hidden: false,
          presentable: false,
        },
        { id: 'regname001', name: 'name', type: 'text', required: true, min: 1, max: 64, presentable: true },
        { id: 'regcntry01', name: 'country', type: 'text', required: false, min: 0, max: 2, pattern: '^([A-Z]{2})?$' },
        { id: 'regcreat01', name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { id: 'regupdat01', name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(regions)

    const ensureRegion = (slug) => {
      try {
        return app.findRecordById('regions', slug)
      } catch {
        const seed = SEED.find((s) => s.id === slug) || { id: slug, name: slug, country: '' }
        const r = new Record(regions)
        r.set('id', seed.id)
        r.set('name', seed.name)
        r.set('country', seed.country)
        app.save(r)
        return r
      }
    }
    SEED.forEach((s) => ensureRegion(s.id))

    // edges.region: text -> relation (same values)
    const edges = app.findCollectionByNameOrId('edges')
    const edgeRegions = {}
    app.findAllRecords('edges').forEach((e) => {
      edgeRegions[e.id] = e.getString('region')
    })
    edges.fields.removeById('edgregion1')
    app.save(edges)
    edges.fields.add(
      new Field({
        id: 'edgregrel1',
        name: 'region',
        type: 'relation',
        collectionId: regions.id,
        maxSelect: 1,
        minSelect: 0,
        cascadeDelete: false,
        required: false,
        hidden: false,
        system: false,
        presentable: false,
      })
    )
    app.save(edges)
    Object.entries(edgeRegions).forEach(([id, slug]) => {
      if (!slug) return
      ensureRegion(slug)
      const e = app.findRecordById('edges', id)
      e.set('region', slug)
      app.save(e)
    })

    // instances.region is derived from the edge now
    const instances = app.findCollectionByNameOrId('instances')
    instances.fields.removeById('insregion1')
    app.save(instances)
  },
  (app) => {
    const edges = app.findCollectionByNameOrId('edges')
    const edgeRegions = {}
    app.findAllRecords('edges').forEach((e) => {
      edgeRegions[e.id] = e.getString('region')
    })
    edges.fields.removeById('edgregrel1')
    app.save(edges)
    edges.fields.add(new Field({ id: 'edgregion1', name: 'region', type: 'text', max: 32, min: 0, required: false }))
    app.save(edges)
    Object.entries(edgeRegions).forEach(([id, slug]) => {
      const e = app.findRecordById('edges', id)
      e.set('region', slug)
      app.save(e)
    })

    const instances = app.findCollectionByNameOrId('instances')
    instances.fields.add(
      new Field({ id: 'insregion1', name: 'region', type: 'text', max: 32, min: 0, required: false })
    )
    app.save(instances)
    app
      .db()
      .newQuery(
        "UPDATE instances SET region = COALESCE((SELECT region FROM edges WHERE edges.id = instances.edge), 'sfo')"
      )
      .execute()

    app.delete(app.findCollectionByNameOrId('regions'))
  }
)
