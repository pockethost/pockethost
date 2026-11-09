import { createHmac, timingSafeEqual } from 'crypto'
import { fmtDate, MS_PER_DAY } from './instanceArchive'

/**
 * Backup icebox. PocketHost keeps each instance's newest PocketBase backup zip in `pb_data/backups`. Older zips move to
 * object storage at `<remote>/<instanceId>/<zipName>`. A `<zipName>.txt` stub takes each one's place, holding a signed
 * download link, so the customer still sees it in the PocketBase Backups list.
 */

export const BACKUP_ICEBOX_DEFAULTS = {
  retentionDays: 180,
  /** Zips modified this recently may still be being written by PocketBase. */
  minAgeMinutes: 60,
  /** A stored zip whose stub is gone waits this long in the trash before it's deleted. */
  trashDays: 14,
  /** Stored zips uploaded more recently than this are never orphans. Their stub may not be written yet. */
  orphanMinAgeHours: 24,
} as const

export const ICEBOX_STUB_SUFFIX = `.txt`
/** First line of every stub. Used to recognize our stubs, so we never delete a customer's own `.txt` file. */
export const ICEBOX_STUB_MARKER = `PocketHost backup icebox`

/** PocketBase backup names: letters, digits, `_`, `-`, `.`, `@` (auto backups start with `@auto_`), ending in `.zip`. */
const ZIP_NAME_RE = /^[A-Za-z0-9_.@-]{1,200}\.zip$/
const INSTANCE_ID_RE = /^[a-z0-9]{15}$/

export const isBackupZipName = (name: string) => ZIP_NAME_RE.test(name) && !name.includes(`..`)

export const iceboxStubName = (zipName: string) => `${zipName}${ICEBOX_STUB_SUFFIX}`

export const backupIceboxObjectPath = (remote: string, instanceId: string, zipName: string) =>
  `${remote.replace(/\/+$/, '')}/${instanceId}/${zipName}`

/** Stored zips whose stub is gone are moved here first, keeping `<instanceId>/<zipName>`. */
export const backupIceboxTrashRemote = (remote: string) => `${remote.replace(/\/+$/, '')}-trash`

export type BackupFile = { name: string; mtimeMs: number; size: number }

export type IceboxPlan = {
  /** The newest finished zip, which stays on disk. */
  keep: BackupFile | null
  /** Older finished zips to move to object storage, oldest first. */
  icebox: BackupFile[]
  /** Zips too recent to touch. They may still be being written. */
  recent: BackupFile[]
}

/**
 * Keep the newest finished zip and icebox the other finished ones. A zip counts as finished once it hasn't been
 * modified for `minAgeMs`. Recent zips are left alone, and the finished zip that sorts newest is kept even when a newer
 * recent one exists, so a failed backup in progress never leaves the instance with no zip on disk.
 */
export const planBackupIcebox = (files: BackupFile[], nowMs: number, minAgeMs: number): IceboxPlan => {
  const zips = files.filter((f) => isBackupZipName(f.name))
  const recent = zips.filter((f) => nowMs - f.mtimeMs < minAgeMs)
  const finished = zips
    .filter((f) => nowMs - f.mtimeMs >= minAgeMs)
    .sort((a, b) => a.mtimeMs - b.mtimeMs || a.name.localeCompare(b.name))
  const keep = finished[finished.length - 1] ?? null
  return { keep, icebox: finished.slice(0, -1), recent }
}

export const backupLinkExpSec = (iceboxedAtMs: number, retentionDays: number) =>
  Math.floor((iceboxedAtMs + retentionDays * MS_PER_DAY) / 1000)

export const mkIceboxStub = (opts: {
  zipName: string
  url: string
  iceboxedAtMs: number
  expSec: number
  retentionDays: number
}) => {
  const until = fmtDate(new Date(opts.expSec * 1000))
  return [
    `${ICEBOX_STUB_MARKER}`,
    ``,
    `This backup (${opts.zipName}) moved to cold storage on ${fmtDate(new Date(opts.iceboxedAtMs))}.`,
    `PocketHost keeps your most recent backup on disk. Older backups are kept in cold storage for ${opts.retentionDays} days.`,
    ``,
    `Download it here (link works until ${until}):`,
    opts.url,
    ``,
    `To restore it, download the zip, then open your PocketBase admin, go to Settings > Backups,`,
    `upload the zip, and restore it.`,
    ``,
    `More: https://pockethost.io/docs/backup-restore`,
    ``,
  ].join(`\n`)
}

export const isIceboxStub = (name: string, firstLine: string) =>
  name.endsWith(`.zip${ICEBOX_STUB_SUFFIX}`) && firstLine.trim() === ICEBOX_STUB_MARKER

/** The link expiry signed into a stub, in seconds since the epoch, or null if the stub has none. */
export const iceboxStubExpSec = (content: string) => {
  const m = content.match(/[?&]exp=(\d+)/)
  return m ? Number(m[1]) : null
}

/** What one instance's backups folder holds. Only instances whose folder was read successfully are listed. */
export type LocalBackups = {
  /** ZipName -> the stub's mtime, for our stubs only. */
  stubs: Map<string, number>
  /** Zip names still on disk. */
  zips: Set<string>
}

export type IceboxObject = {
  instanceId: string
  zipName: string
  size: number
  /** When it was uploaded. */
  modTimeMs: number
  /** The zip's mtime on disk before upload, which rclone keeps as metadata. */
  origMtimeMs: number | null
}

export type IceboxCleanupPlan = {
  /** Past retention, counted from upload. */
  expire: IceboxObject[]
  /** Stub and zip are both gone from a folder we could read, so nothing points at it any more. */
  orphans: IceboxObject[]
  /** Stubs whose mtime should match the original zip's, so PocketBase prunes them in their real order. */
  touch: { instanceId: string; zipName: string; mtimeMs: number }[]
}

/**
 * Decides what happens to each stored zip. An instance missing from `local` (its folder is gone or unreadable) never
 * has orphans: a lost volume must not take its cold copies with it. Those zips only expire.
 */
export const planIceboxCleanup = (opts: {
  local: Map<string, LocalBackups>
  objects: IceboxObject[]
  nowMs: number
  retentionMs: number
  orphanMinAgeMs: number
}): IceboxCleanupPlan => {
  const plan: IceboxCleanupPlan = { expire: [], orphans: [], touch: [] }
  for (const o of opts.objects) {
    if (opts.nowMs - o.modTimeMs >= opts.retentionMs) {
      plan.expire.push(o)
      continue
    }
    const dir = opts.local.get(o.instanceId)
    if (!dir) continue
    const stubMtimeMs = dir.stubs.get(o.zipName)
    if (stubMtimeMs !== undefined) {
      if (o.origMtimeMs !== null && Math.abs(stubMtimeMs - o.origMtimeMs) >= 1000) {
        plan.touch.push({ instanceId: o.instanceId, zipName: o.zipName, mtimeMs: o.origMtimeMs })
      }
      continue
    }
    if (dir.zips.has(o.zipName)) continue
    if (opts.nowMs - o.modTimeMs < opts.orphanMinAgeMs) continue
    plan.orphans.push(o)
  }
  return plan
}

/* Signed links: same scheme as instance archives, with the zip name in the signed payload. */

const sign = (instanceId: string, zipName: string, expSec: number, secret: string) =>
  createHmac(`sha256`, secret).update(`backup:${instanceId}/${zipName}:${expSec}`).digest(`base64url`)

export const mkBackupDownloadUrl = (
  origin: string,
  instanceId: string,
  zipName: string,
  expSec: number,
  secret: string
) => {
  if (!secret) throw new Error(`Archive link secret is not configured`)
  const url = new URL(`/_ph/backup/${instanceId}/${encodeURIComponent(zipName)}`, origin)
  url.searchParams.set(`exp`, String(expSec))
  url.searchParams.set(`sig`, sign(instanceId, zipName, expSec, secret))
  return url.toString()
}

export type BackupLinkCheck = { ok: true } | { ok: false; status: 400 | 403 | 410; reason: string }

export const verifyBackupLink = (
  instanceId: string,
  zipName: string,
  expRaw: unknown,
  sigRaw: unknown,
  secret: string,
  nowMs: number
): BackupLinkCheck => {
  if (!secret) return { ok: false, status: 403, reason: `link signing is not configured` }
  if (!INSTANCE_ID_RE.test(instanceId)) return { ok: false, status: 400, reason: `bad instance id` }
  if (!isBackupZipName(zipName)) return { ok: false, status: 400, reason: `bad backup name` }
  if (typeof expRaw !== `string` || typeof sigRaw !== `string` || !/^\d+$/.test(expRaw)) {
    return { ok: false, status: 400, reason: `malformed link` }
  }
  const expSec = Number(expRaw)
  const expected = Buffer.from(sign(instanceId, zipName, expSec, secret))
  const given = Buffer.from(sigRaw)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, status: 403, reason: `invalid signature` }
  }
  if (nowMs > expSec * 1000) return { ok: false, status: 410, reason: `link expired` }
  return { ok: true }
}
