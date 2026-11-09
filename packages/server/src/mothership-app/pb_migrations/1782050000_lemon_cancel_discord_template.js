/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('message_templates')
    const slug = 'lemon_cancel_discord'
    const subject = 'someone just cancelled {$PRODUCT_NAME} - {$VARIANT_NAME}'

    let record
    try {
      record = app.findFirstRecordByData('message_templates', 'slug', slug)
      record.set('subject', subject)
    } catch {
      record = new Record(collection, {
        slug,
        subject,
      })
    }

    app.save(record)
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('message_templates', 'slug', 'lemon_cancel_discord')
      app.delete(record)
    } catch {
      // already removed
    }
  }
)
