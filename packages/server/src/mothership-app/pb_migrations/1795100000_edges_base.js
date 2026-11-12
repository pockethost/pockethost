/// <reference path="../pb_data/types.d.ts" />
// Undo 1795000000_edges_auth (Ben, 2026-11-12): edges log in to the mothership as a superuser again, from the
// MOTHERSHIP_ADMIN_USERNAME/PASSWORD in their edge.env. `edges` goes back to a base collection (same record ids,
// instances.edge repointed, original collection id), and the users/instances/deploys rules lose their edge clauses.
// The edge-only routes were reverted in the same change. The rebuild code is the same as 1795000000's.

const EDGES_AUTH_ID = 'pbc_edgesauth01'
const EDGE_RULE = '@request.auth.collectionName = "edges"'

const RULES = {
  users: {
    listRule: ['id = @request.auth.id', `id = @request.auth.id || ${EDGE_RULE}`],
    viewRule: ['id = @request.auth.id', `id = @request.auth.id || ${EDGE_RULE}`],
  },
  instances: {
    listRule: ['uid=@request.auth.id', `uid = @request.auth.id || ${EDGE_RULE}`],
    viewRule: ['uid = @request.auth.id', `uid = @request.auth.id || ${EDGE_RULE}`],
    updateRule: [null, `${EDGE_RULE} && edge = @request.auth.id`],
  },
  deploys: {
    createRule: [null, `${EDGE_RULE} && instance.edge = @request.auth.id`],
  },
}

const applyRules = (app, which) => {
  Object.entries(RULES).forEach(([name, rules]) => {
    const c = app.findCollectionByNameOrId(name)
    Object.entries(rules).forEach(([rule, values]) => {
      c[rule] = values[which]
    })
    app.save(c)
  })
}

// Rebuild `edges` as `type`, keeping fields (minus auth-only ones), record ids, timestamps and instances.edge.
const rebuildEdges = (app, type, newId) => {
  const old = app.findCollectionByNameOrId('edges')
  const AUTH_ONLY = ['password', 'tokenKey', 'email', 'emailVisibility', 'verified']

  // instances.edge, kept outside the collection in case the relation has to be recreated
  app.db().newQuery('DROP TABLE IF EXISTS `_edges_rebuild_map`').execute()
  app.db().newQuery("CREATE TABLE `_edges_rebuild_map` AS SELECT id, edge FROM instances WHERE edge != ''").execute()
  // without it, restoring ~25k instances scans the map once per row (25 s on a copy of production; the mothership is down meanwhile)
  app.db().newQuery('CREATE UNIQUE INDEX `_edges_rebuild_map_id` ON `_edges_rebuild_map` (id)').execute()

  const records = app.findAllRecords('edges').map((r) => ({
    id: r.id,
    created: r.getString('created'),
    updated: r.getString('updated'),
    data: r.publicExport(),
  }))

  old.name = 'edges_rebuild_old'
  old.indexes = []
  // its edge_id index is gone, so (going back down) it can't stay the login identity
  if (old.type === 'auth') old.passwordAuth = { enabled: false, identityFields: ['email'] }
  app.save(old)

  const next = new Collection({ id: newId, name: 'edges', type })
  old.fields.forEach((f) => {
    if (f.system || f.name === 'id') return
    if (type === 'base' && AUTH_ONLY.includes(f.name)) return
    if (next.fields.getByName(f.name)) return
    next.fields.add(f)
  })
  ;['created', 'updated'].forEach((name) => {
    if (!next.fields.getByName(name)) {
      next.fields.add(new Field({ name, type: 'autodate', onCreate: true, onUpdate: name === 'updated' }))
    }
  })
  next.indexes = ['CREATE UNIQUE INDEX `idx_edges_edge_id` ON `edges` (`edge_id`)']
  next.listRule = type === 'auth' ? EDGE_RULE : null
  next.viewRule = type === 'auth' ? EDGE_RULE : null
  next.createRule = null
  next.updateRule = null
  next.deleteRule = null
  if (type === 'auth') {
    next.fields.getByName('email').required = false
    next.passwordAuth = { enabled: true, identityFields: ['edge_id'] }
    next.oauth2 = { enabled: false }
    next.otp = { enabled: false }
    next.mfa = { enabled: false }
    next.authAlert = { enabled: false }
  }
  app.save(next)

  records.forEach((src) => {
    const r = new Record(next)
    r.id = src.id
    Object.entries(src.data).forEach(([k, v]) => {
      if (k === 'id' || k === 'created' || k === 'updated' || k === 'collectionId' || k === 'collectionName') return
      if (AUTH_ONLY.includes(k)) return
      if (!next.fields.getByName(k)) return
      r.set(k, v)
    })
    if (type === 'auth') r.setRandomPassword()
    app.saveNoValidate(r)
    app
      .db()
      .newQuery('UPDATE `edges` SET created = {:c}, updated = {:u} WHERE id = {:id}')
      .bind({ c: src.created, u: src.updated, id: src.id })
      .execute()
  })

  // Point instances.edge at the new collection: same field id and name, values restored from the map.
  const instances = app.findCollectionByNameOrId('instances')
  const edgeField = instances.fields.getByName('edge')
  const def = {
    id: edgeField.id,
    name: 'edge',
    type: 'relation',
    collectionId: next.id,
    maxSelect: 1,
    minSelect: 0,
    cascadeDelete: false,
    required: false,
    hidden: edgeField.hidden,
    system: false,
    presentable: false,
  }
  instances.fields.removeById(edgeField.id)
  app.save(instances)
  instances.fields.add(new Field(def))
  app.save(instances)
  app
    .db()
    .newQuery(
      'UPDATE instances SET edge = (SELECT m.edge FROM `_edges_rebuild_map` m WHERE m.id = instances.id) ' +
        'WHERE id IN (SELECT id FROM `_edges_rebuild_map`)'
    )
    .execute()
  app.db().newQuery('DROP TABLE `_edges_rebuild_map`').execute()

  app.delete(app.findCollectionByNameOrId('edges_rebuild_old'))
}

migrate(
  (app) => {
    applyRules(app, 0)
    rebuildEdges(app, 'base', 'p7edgeslive01ab')
  },
  (app) => {
    rebuildEdges(app, 'auth', EDGES_AUTH_ID)
    applyRules(app, 1)
  }
)
