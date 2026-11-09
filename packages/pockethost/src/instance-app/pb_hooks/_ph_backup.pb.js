/**
 * PocketHost: scheduled backups. Works on PocketBase 0.17+ (both hooks APIs).
 *
 * GET /api/ph/backup with header `x-ph-backup-token: $PH_BACKUP_TOKEN` creates `@auto_pb_backup_ph_<stamp>.zip` (on
 * disk or in S3, per Settings > Backups), then keeps the newest Max @auto backups, the same way PocketBase prunes its
 * own scheduled backups. PocketHost webhooks send the token, so a webhook pointed at this path schedules backups. The
 * request stays open until the backup finishes, which keeps the instance awake for the whole backup.
 */
routerAdd('GET', '/api/ph/backup', (c) => {
  // 0.17–0.22 pass an echo context (methods); 0.23+ pass a RequestEvent (properties).
  const legacy = typeof c.request === 'function'
  const req = legacy ? c.request() : c.request

  const expected = $os.getenv('PH_BACKUP_TOKEN')
  if (!expected || req.header.get('x-ph-backup-token') !== expected) {
    return c.json(401, { error: 'Unauthorized' })
  }

  const prefix = '@auto_pb_backup_'
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const name = `${prefix}ph_${stamp}.zip`

  try {
    $app.createBackup(req.context(), name)
  } catch (err) {
    // Most often another backup or restore is already running.
    return c.json(409, { error: `Backup failed: ${err}` })
  }

  let removed = 0
  const maxKeep = $app.settings().backups.cronMaxKeep
  if (maxKeep > 0) {
    const fsys = $app.newBackupsFilesystem()
    try {
      // Newest first by modified time, like PocketBase, so its own `@auto_pb_backup_<app>_*` zips sort in too.
      const files = fsys.list(prefix).sort((a, b) => b.modTime.unix() - a.modTime.unix())
      for (const f of files.slice(maxKeep)) {
        fsys.delete(f.key)
        removed++
      }
    } finally {
      fsys.close()
    }
  }

  return c.json(200, { ok: true, name, removed })
})
