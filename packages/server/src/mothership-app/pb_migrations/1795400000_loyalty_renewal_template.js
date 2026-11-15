/// <reference path="../pb_data/types.d.ts" />
// Email after each paid renewal: where the owner's loyalty bonus stands. Editable in the admin (message_templates).
migrate(
  (app) => {
    const slug = 'loyalty_renewal'
    try {
      app.findFirstRecordByData('message_templates', 'slug', slug)
      return // keep admin edits
    } catch {}
    const record = new Record(app.findCollectionByNameOrId('message_templates'), {
      slug,
      subject: 'How to keep your bonus instances',
      body_html: [
        '<p>Hey, just a heads up that your subscription renewed and you got another credit toward a bonus instance.</p>',
        '<p>Current: {$CURRENT}<br>Next one: {$NEXT}<br>Max: {$MAX}</p>',
        "<p>~b<br>Ben Allfree, Cap'n</p>",
      ].join('\n'),
    })
    app.save(record)
  },
  (app) => {
    try {
      app.delete(app.findFirstRecordByData('message_templates', 'slug', 'loyalty_renewal'))
    } catch {
      // already removed
    }
  }
)
