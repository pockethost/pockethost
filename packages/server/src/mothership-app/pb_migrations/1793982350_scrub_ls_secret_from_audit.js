/// <reference path="../pb_data/types.d.ts" />
// The pre-2026-11-06 Lemon Squeezy webhook handler stored LS_WEBHOOK_SECRET in its debug context, which was
// written to audit.context and copied into notifications.payload / message_template_vars. Remove that key.
// Irreversible by design (down is a no-op).
migrate(
  (app) => {
    const scrub = (table, column) => {
      const res = app
        .db()
        .newQuery(
          `UPDATE ${table} SET ${column} = json_remove(${column}, '$.secret') ` +
            `WHERE json_valid(${column}) AND json_type(${column}, '$.secret') IS NOT NULL`
        )
        .execute()
      console.log(`scrub_ls_secret: ${table}.${column} rows updated: ${res.rowsAffected()}`)
    }
    scrub('audit', 'context')
    scrub('notifications', 'payload')
    scrub('notifications', 'message_template_vars')
  },
  () => {}
)
