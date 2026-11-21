/// <reference path="../pb_data/types.d.ts" />
// What an instance gets from its owner, resolved on the mothership so edges never read users (mothership_owners.go):
// `blocked` ({status, message} or null), `superusers` (the owner's login when syncAdmin), `trusted_ips` (the owner's)
// and `owners` (user ids that may deploy). Hidden: only superusers (the edges, the mothership's Go) read them, and
// only the mothership's Go writes them; it fills them on the next serve.
migrate(
  (app) => {
    const instances = app.findCollectionByNameOrId('instances')
    const json = (id, name) =>
      new Field({
        hidden: true,
        id,
        maxSize: 200000,
        name,
        presentable: false,
        required: false,
        system: false,
        type: 'json',
      })
    instances.fields.add(json('ownblocked01', 'blocked'))
    instances.fields.add(json('ownsupers001', 'superusers'))
    instances.fields.add(json('owntrusted01', 'trusted_ips'))
    instances.fields.add(json('ownowners001', 'owners'))
    app.save(instances)
  },
  (app) => {
    const instances = app.findCollectionByNameOrId('instances')
    for (const id of ['ownblocked01', 'ownsupers001', 'owntrusted01', 'ownowners001']) {
      if (instances.fields.getById(id)) instances.fields.removeById(id)
    }
    app.save(instances)
  }
)
