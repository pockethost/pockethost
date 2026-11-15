/// <reference path="../pb_data/types.d.ts" />
// Copies the legacy bulk mailer into the CE bulk mail collections (created by 1794600000_created_bulkmail.js):
//   campaign_messages (+ campaigns)  -> _bulkmail_campaigns, one per message, SAME ID (so `mail send <id>` still works)
//   sent_messages                    -> _bulkmail_sends rows with status "sent" (the no-duplicates ledger)
//   users.unsubscribe = true         -> _bulkmail_suppressions ("unsubscribed")
// Old collections are left in place, untouched. Safe to re-run: existing rows are skipped.
migrate(
  (app) => {
    const now = new Date().toISOString().replace('T', ' ')
    const db = app.db()
    const has = (name) => {
      try {
        app.findCollectionByNameOrId(name)
        return true
      } catch (_e) {
        return false
      }
    }
    if (!has('campaign_messages') || !has('campaigns')) return

    const convert = (src) => `${src || ''}`.replace(/\{\$(\w+)\}/g, (_m, key) => `{{${key.toLowerCase()}}}`)

    const messages = arrayOf(
      new DynamicModel({ id: '', subject: '', body: '', created: '', updated: '', cname: '', vars: '', usersQuery: '' })
    )
    db.newQuery(
      `SELECT m.id, m.subject, m.body, m.created, m.updated,
              COALESCE(c.name, '') AS cname, COALESCE(c.vars, '') AS vars, COALESCE(c.usersQuery, '') AS usersQuery
         FROM campaign_messages m LEFT JOIN campaigns c ON c.id = m.campaign`
    ).all(messages)

    const campaigns = app.findCollectionByNameOrId('_bulkmail_campaigns')
    for (const m of messages) {
      let exists = false
      try {
        app.findRecordById('_bulkmail_campaigns', m.id)
        exists = true
      } catch (_e) {}
      if (exists) continue

      let legacyVars = {}
      try {
        legacyVars = JSON.parse(m.vars || '{}') || {}
      } catch (_e) {}
      const vars = { messageid: m.id } // the legacy sender always provided {$messageId}
      for (const k of Object.keys(legacyVars)) {
        vars[k.toLowerCase()] = { sql: `${legacyVars[k]}` }
      }

      const sentRow = new DynamicModel({ n: 0 })
      db.newQuery(`SELECT COUNT(*) AS n FROM sent_messages WHERE campaign_message = {:id}`).bind({ id: m.id }).one(sentRow)

      const rec = new Record(campaigns)
      rec.set('id', m.id)
      rec.set('name', [m.cname, m.subject].filter((v) => v).join(' / ').slice(0, 200) || m.id)
      rec.set('subject', convert(m.subject))
      rec.set('html', convert(m.body))
      rec.set('audience', m.usersQuery ? { sql: m.usersQuery } : { collection: 'users', filter: 'verified = true && unsubscribe = false' })
      rec.set('vars', vars)
      rec.set('status', sentRow.n > 0 ? 'done' : 'draft')
      rec.set('status_reason', sentRow.n > 0 ? 'Imported from the legacy mailer.' : '')
      app.save(rec)
    }

    // the ledger: one "sent" row per message and address (users that were deleted since have no address; skipped)
    db.newQuery(
      `INSERT OR IGNORE INTO _bulkmail_sends
         (id, campaign, email, record_ref, status, reason, attempts, retry_at, sent_at, message_id, created, updated)
       SELECT 'r'||lower(hex(randomblob(7))), s.campaign_message, lower(trim(u.email)), 'users:'||u.id, 'sent',
              'imported from sent_messages', 1, '', s.created, '', s.created, {:now}
         FROM sent_messages s
         JOIN users u ON u.id = s.user
         JOIN _bulkmail_campaigns c ON c.id = s.campaign_message
        WHERE trim(u.email) != ''`
    )
      .bind({ now })
      .execute()

    db.newQuery(
      `UPDATE _bulkmail_campaigns SET
         sent = (SELECT COUNT(*) FROM _bulkmail_sends s WHERE s.campaign = _bulkmail_campaigns.id AND s.status = 'sent'),
         queued = 0, skipped = 0, failed = 0,
         started_at = COALESCE((SELECT MIN(s.sent_at) FROM _bulkmail_sends s WHERE s.campaign = _bulkmail_campaigns.id), ''),
         finished_at = COALESCE((SELECT MAX(s.sent_at) FROM _bulkmail_sends s WHERE s.campaign = _bulkmail_campaigns.id), '')
       WHERE status = 'done' AND status_reason = 'Imported from the legacy mailer.'`
    ).execute()

    // unsubscribed users -> suppression list (raw SQL: no hooks fire during the migration)
    db.newQuery(
      `INSERT OR IGNORE INTO _bulkmail_suppressions (id, email, reason, source, campaign, created, updated)
       SELECT 'r'||lower(hex(randomblob(7))), lower(trim(email)), 'unsubscribed', 'legacy users.unsubscribe', '', {:now}, {:now}
         FROM users
        WHERE unsubscribe = 1 AND trim(email) != ''`
    )
      .bind({ now })
      .execute()
  },
  (_app) => {
    // never deletes: the ledger and suppressions are the record of who may be mailed
  }
)
