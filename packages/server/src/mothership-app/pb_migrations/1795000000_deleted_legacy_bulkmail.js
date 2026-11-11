/// <reference path="../pb_data/types.d.ts" />
// Drops the legacy bulk mailer's collections (sent_messages, campaign_messages, campaigns). Their data was copied
// into the CE _bulkmail_* collections by 1794600001_imported_legacy_bulkmail.js, and nothing reads them since.
// Ship only after the Nov 16, 2026 send went out through the new sender (Ben, 2026-11-11).
//
// Refuses to run if any legacy message or sent row is missing from the new collections, so a skipped import can't
// lose history.
migrate(
  (app) => {
    const has = (id) => {
      try {
        return app.findCollectionByNameOrId(id)
      } catch (_e) {
        return null
      }
    }
    const sent = has('18rfmj8aklx6bjq') // sent_messages
    const messages = has('w1vjr1edr5tsam3') // campaign_messages
    const campaigns = has('yfhnigik0uvyt4m') // campaigns
    if (!sent && !messages && !campaigns) return

    const count = (sql) => {
      const row = new DynamicModel({ n: 0 })
      app.db().newQuery(sql).one(row)
      return row.n
    }
    if (messages) {
      const missing = count(
        `SELECT COUNT(*) AS n FROM campaign_messages m WHERE NOT EXISTS (SELECT 1 FROM _bulkmail_campaigns c WHERE c.id = m.id)`
      )
      if (missing > 0) throw new Error(`${missing} campaign_messages not in _bulkmail_campaigns; not dropping`)
    }
    if (sent) {
      const missing = count(
        `SELECT COUNT(*) AS n FROM sent_messages s JOIN users u ON u.id = s.user
          WHERE trim(u.email) != '' AND NOT EXISTS (
            SELECT 1 FROM _bulkmail_sends b WHERE b.campaign = s.campaign_message AND b.email = lower(trim(u.email)))`
      )
      if (missing > 0) throw new Error(`${missing} sent_messages not in _bulkmail_sends; not dropping`)
    }

    // relations point sent_messages -> campaign_messages -> campaigns, so drop in that order
    for (const c of [sent, messages, campaigns]) {
      if (c) app.delete(c)
    }
  },
  (_app) => {
    // not restored: the history lives on in _bulkmail_campaigns and _bulkmail_sends
  }
)
