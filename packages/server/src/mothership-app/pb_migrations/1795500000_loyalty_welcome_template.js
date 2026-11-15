/// <reference path="../pb_data/types.d.ts" />
// Email on a new loyalty-eligible purchase: how to keep and earn bonus instances. Editable in the admin
// (message_templates).
migrate(
  (app) => {
    const slug = 'loyalty_welcome'
    try {
      app.findFirstRecordByData('message_templates', 'slug', slug)
      return // keep admin edits
    } catch {}
    const record = new Record(app.findCollectionByNameOrId('message_templates'), {
      slug,
      subject: 'How to keep your bonus instances',
      body_html: [
        "<p>Hey, thanks for subscribing! Here's where your bonus instances stand.</p>",
        '<p>Current: {$CURRENT}<br>Next one: {$NEXT}<br>Max: {$MAX}</p>',
        "<p>~b<br>Ben Allfree, Cap'n</p>",
      ].join('\n'),
    })
    app.save(record)
  },
  (app) => {
    try {
      app.delete(app.findFirstRecordByData('message_templates', 'slug', 'loyalty_welcome'))
    } catch {
      // already removed
    }
  }
)
