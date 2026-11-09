/// <reference path="../pb_data/types.d.ts" />
// Edge affinity. Edges report `region` and `internal_url` in their heartbeat; other edges route to them through the
// mirror. Every instance gets a customer-chosen `region` (fixed at creation) and the one `edge` that runs it (picked by
// the mothership, hidden from customers). Existing instances all live on the `sfo` edge.
migrate(
  (app) => {
    const edges = app.findCollectionByNameOrId('edges')
    edges.fields.add(
      new Field({
        id: 'edgregion1',
        name: 'region',
        type: 'text',
        max: 32,
        min: 0,
        required: false,
        hidden: false,
        system: false,
        presentable: false,
        pattern: '',
        autogeneratePattern: '',
        primaryKey: false,
      })
    )
    edges.fields.add(
      new Field({
        id: 'edginturl1',
        name: 'internal_url',
        type: 'text',
        max: 255,
        min: 0,
        required: false,
        hidden: false,
        system: false,
        presentable: false,
        pattern: '',
        autogeneratePattern: '',
        primaryKey: false,
      })
    )
    app.save(edges)

    const instances = app.findCollectionByNameOrId('instances')
    instances.fields.add(
      new Field({
        id: 'insregion1',
        name: 'region',
        type: 'text',
        max: 32,
        min: 0,
        required: false,
        hidden: false,
        system: false,
        presentable: false,
        pattern: '',
        autogeneratePattern: '',
        primaryKey: false,
      })
    )
    instances.fields.add(
      new Field({
        id: 'insedge001',
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
      })
    )
    app.save(instances)

    let sfo
    try {
      sfo = app.findFirstRecordByData('edges', 'edge_id', 'sfo')
    } catch {
      sfo = new Record(edges)
      sfo.set('edge_id', 'sfo')
      sfo.set('label', 'sfo')
    }
    sfo.set('region', 'sfo')
    app.save(sfo)

    // Raw SQL: 25k rows, no hooks, no `updated` bump (edges pick the fields up on their next full sync).
    app
      .db()
      .newQuery("UPDATE instances SET region = 'sfo', edge = {:edge} WHERE region = '' OR region IS NULL")
      .bind({ edge: sfo.id })
      .execute()
  },
  (app) => {
    const instances = app.findCollectionByNameOrId('instances')
    instances.fields.removeById('insregion1')
    instances.fields.removeById('insedge001')
    app.save(instances)
    const edges = app.findCollectionByNameOrId('edges')
    edges.fields.removeById('edgregion1')
    edges.fields.removeById('edginturl1')
    app.save(edges)
  }
)
