import { createHmac } from 'crypto'

/**
 * Per-instance token for the seeded backup route (`GET /api/ph/backup` in `instance-app/pb_hooks/_ph_backup.pb.js`).
 * The daemon passes it to the instance as `PH_BACKUP_TOKEN`, and webhooks send it in this header, so a scheduled
 * webhook can run a backup without a superuser login. It only lets the holder start a backup of that one instance.
 */
export const BACKUP_TOKEN_HEADER = `x-ph-backup-token`

export const mkBackupToken = (instanceId: string, secret: string) =>
  createHmac(`sha256`, secret).update(`backup-token:${instanceId}`).digest(`base64url`)
