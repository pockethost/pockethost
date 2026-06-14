/// <reference path="../pb_data/types.d.ts" />
/// Drops legacy SQL views that block PocketBase 0.39 embedded migrator (passwordHash rename on users).
/// No app code reads these after stats API removal. Restore post-v0.39 — see backlog.
migrate((db) => {
  db.newQuery(`DELETE FROM _collections WHERE type = 'view' AND system = 0`).execute()

  const views = [
    'stats',
    'subscribed_users',
    'user_growth_by_month',
    'verified_users',
    'duplicate_emails',
    'growth_by_day',
    'unverified_users',
  ]

  for (const name of views) {
    db.newQuery(`DROP VIEW IF EXISTS ${name}`).execute()
  }
})
