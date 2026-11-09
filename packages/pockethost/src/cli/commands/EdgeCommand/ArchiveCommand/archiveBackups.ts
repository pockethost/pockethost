import {
  BACKUP_ICEBOX_DEFAULTS,
  BackupFile,
  INSTANCES_ROOT,
  LocalBackups,
  LoggerService,
  MS_PER_DAY,
  PH_ARCHIVE_LINK_ORIGIN,
  PH_ARCHIVE_LINK_SECRET,
  PH_BACKUP_ICEBOX_REMOTE,
  backupIceboxTrashRemote,
  backupLinkExpSec,
  deleteBackupIceboxObject,
  iceboxStubExpSec,
  iceboxStubName,
  isBackupZipName,
  isIceboxStub,
  listBackupIcebox,
  mkBackupDownloadUrl,
  mkIceboxStub,
  planBackupIcebox,
  planIceboxCleanup,
  trashBackupIceboxObject,
  uploadBackupZip,
  verifyBackupZip,
} from '@'
import { existsSync } from 'fs'
import { chown, open, readdir, rename, rm, stat, utimes, writeFile } from 'fs/promises'
import { join } from 'path'
import { formatBytes, mapLimit } from '../edgeUtils'

export type ArchiveBackupsOptions = {
  apply: boolean
  retentionDays?: number
  minAgeMinutes?: number
  /** Cap on bytes moved per run, largest zips first. */
  maxBytes?: number
  concurrency?: number
  /** Limit the run to one instance. */
  instanceId?: string
}

type Item = { instanceId: string; dir: string; file: BackupFile }

const INSTANCE_ID_RE = /^[a-z0-9]{15}$/

/** Stubs are under 2 KB. Reading only the head keeps a large customer `.zip.txt` file cheap. */
const readHead = async (path: string, bytes = 4096) => {
  const fh = await open(path, `r`)
  try {
    const buf = Buffer.alloc(bytes)
    const { bytesRead } = await fh.read(buf, 0, bytes, 0)
    return buf.subarray(0, bytesRead).toString(`utf8`)
  } finally {
    await fh.close()
  }
}

/** Refuse to trash more than this share of all stored zips in one run. Something is wrong if that many look orphaned. */
const MAX_ORPHAN_SHARE = 0.5
const ORPHAN_GUARD_MIN = 20

const listBackupDir = async (dir: string) => {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: BackupFile[] = []
  for (const e of entries) {
    if (!e.isFile()) continue
    const s = await stat(join(dir, e.name))
    files.push({ name: e.name, mtimeMs: s.mtimeMs, size: s.size })
  }
  return files
}

/**
 * `edge archive backups`: keep each instance's newest PocketBase backup zip on disk and move the older ones to object
 * storage, leaving a `.zip.txt` stub with a signed download link.
 *
 * Each stub's mtime is set to the original zip's, because PocketBase counts `@auto_` stubs toward Max @auto backups and
 * removes the oldest by mtime. With the upload time instead, stubs would outrank real zips and PocketBase would delete
 * the real ones first.
 *
 * Also deletes stubs and stored zips past retention, and trashes stored zips whose stub and zip are both gone (the
 * customer or PocketBase removed it). Trashed zips are deleted after `trashDays`.
 */
export const archiveBackups = async ({
  apply,
  retentionDays = BACKUP_ICEBOX_DEFAULTS.retentionDays,
  minAgeMinutes = BACKUP_ICEBOX_DEFAULTS.minAgeMinutes,
  maxBytes = Infinity,
  concurrency = 4,
  instanceId,
}: ArchiveBackupsOptions) => {
  const { trashDays, orphanMinAgeHours } = BACKUP_ICEBOX_DEFAULTS
  const { info, warn, error } = LoggerService().create(`archiveBackups`)
  const root = INSTANCES_ROOT()
  const remote = PH_BACKUP_ICEBOX_REMOTE()
  const secret = PH_ARCHIVE_LINK_SECRET()
  const origin = PH_ARCHIVE_LINK_ORIGIN()
  if (apply && !secret) throw new Error(`PH_ARCHIVE_LINK_SECRET (or PH_SECRET) must be set to sign download links`)

  const nowMs = Date.now()
  const retentionMs = retentionDays * MS_PER_DAY
  const mode = apply ? `APPLY` : `DRY RUN`
  info(
    `[${mode}] remote=${remote} retention=${retentionDays}d min-age=${minAgeMinutes}m cap=${formatBytes(maxBytes)} concurrency=${concurrency}`
  )

  /* ---------- Scan ---------- */
  const ids = instanceId ? [instanceId] : (await readdir(root)).filter((n) => INSTANCE_ID_RE.test(n))
  const work: Item[] = []
  const expiredStubs: string[] = []
  const local = new Map<string, LocalBackups>()
  let scanned = 0
  let keptBytes = 0
  for (const id of ids) {
    const dir = join(root, id, `pb_data`, `backups`)
    if (!existsSync(dir)) continue
    let files: BackupFile[]
    try {
      files = await listBackupDir(dir)
    } catch (e) {
      warn(`  could not read ${dir}: ${e}`)
      continue
    }
    scanned++
    const plan = planBackupIcebox(files, nowMs, minAgeMinutes * 60_000)
    keptBytes += plan.keep?.size ?? 0
    for (const file of plan.icebox) work.push({ instanceId: id, dir, file })
    const backups: LocalBackups = { stubs: new Map(), zips: new Set() }
    for (const f of files) {
      if (isBackupZipName(f.name)) backups.zips.add(f.name)
      if (!f.name.endsWith(`.zip.txt`)) continue
      const path = join(dir, f.name)
      const head = await readHead(path).catch(() => ``)
      if (!isIceboxStub(f.name, head.split(`\n`)[0] ?? ``)) continue
      backups.stubs.set(f.name.slice(0, -`.txt`.length), f.mtimeMs)
      // The stub's mtime is the original backup time, so expiry comes from the link it holds.
      const expSec = iceboxStubExpSec(head)
      if (expSec === null) warn(`  stub without a link expiry: ${id}/${f.name}`)
      else if (nowMs >= expSec * 1000) expiredStubs.push(path)
    }
    local.set(id, backups)
  }

  // Listed before this run uploads anything, so a zip whose stub isn't written yet can't look orphaned.
  const objects = (await listBackupIcebox(remote)).filter((o) => !instanceId || o.instanceId === instanceId)
  const cleanup = planIceboxCleanup({
    local,
    objects,
    nowMs,
    retentionMs,
    orphanMinAgeMs: orphanMinAgeHours * 3_600_000,
  })
  const orphanGuardTripped =
    cleanup.orphans.length > ORPHAN_GUARD_MIN && cleanup.orphans.length > objects.length * MAX_ORPHAN_SHARE
  if (orphanGuardTripped) {
    warn(`${cleanup.orphans.length} of ${objects.length} stored zips look orphaned. Not trashing any; check this run.`)
  }
  const trashRemote = backupIceboxTrashRemote(remote)
  const trashed = (await listBackupIcebox(trashRemote)).filter((o) => !instanceId || o.instanceId === instanceId)
  const trashExpired = trashed.filter((o) => nowMs - o.modTimeMs >= trashDays * MS_PER_DAY)

  work.sort((a, b) => b.file.size - a.file.size)
  const selected: Item[] = []
  let selectedBytes = 0
  for (const item of work) {
    if (selectedBytes + item.file.size > maxBytes) continue
    selected.push(item)
    selectedBytes += item.file.size
  }
  const instancesTouched = new Set(selected.map((i) => i.instanceId)).size
  info(
    `scanned ${scanned} backup folders: icebox ${selected.length} zips (${formatBytes(selectedBytes)}) across ${instancesTouched} instances, ` +
      `keep ${formatBytes(keptBytes)} on disk; ${work.length - selected.length} zips over the cap wait for the next run; ` +
      `${expiredStubs.length} expired stubs`
  )
  info(
    `cold storage: ${objects.length} stored zips, ${cleanup.expire.length} past retention, ` +
      `${cleanup.orphans.length} orphaned, ${cleanup.touch.length} stubs to re-date; ` +
      `${trashed.length} in trash, ${trashExpired.length} past ${trashDays}d`
  )
  for (const o of cleanup.orphans.slice(0, 20)) info(`  orphan ${o.instanceId}/${o.zipName} ${formatBytes(o.size)}`)
  if (cleanup.orphans.length > 20) info(`  ...and ${cleanup.orphans.length - 20} more orphans`)
  for (const item of selected.slice(0, 20)) {
    info(`  ${item.instanceId}/${item.file.name} ${formatBytes(item.file.size)}`)
  }
  if (selected.length > 20) info(`  ...and ${selected.length - 20} more`)

  const summary = {
    iceboxed: 0,
    bytes: 0,
    failed: 0,
    stubsDeleted: 0,
    objectsDeleted: 0,
    stubsRedated: 0,
    orphansTrashed: 0,
    trashDeleted: 0,
  }

  if (apply) {
    /* ---------- Icebox pass ---------- */
    await mapLimit(selected, concurrency, async ({ instanceId: id, dir, file }) => {
      const zipPath = join(dir, file.name)
      try {
        // Re-check right before moving: PocketBase may have rotated or replaced it since the scan.
        const now = await stat(zipPath).catch(() => null)
        if (!now || now.size !== file.size || now.mtimeMs !== file.mtimeMs) {
          info(`  skip ${id}/${file.name}: changed since scan`)
          return
        }
        await uploadBackupZip(zipPath, remote, id)
        await verifyBackupZip(zipPath, remote, id)

        const iceboxedAtMs = Date.now()
        const expSec = backupLinkExpSec(iceboxedAtMs, retentionDays)
        const url = mkBackupDownloadUrl(origin, id, file.name, expSec, secret)
        const stubPath = join(dir, iceboxStubName(file.name))
        const tmpPath = `${stubPath}.tmp-icebox`
        await writeFile(tmpPath, mkIceboxStub({ zipName: file.name, url, iceboxedAtMs, expSec, retentionDays }))
        await utimes(tmpPath, new Date(), new Date(file.mtimeMs))
        const dirStat = await stat(dir)
        await chown(tmpPath, dirStat.uid, dirStat.gid).catch(() => {})
        await rename(tmpPath, stubPath)

        await rm(zipPath)
        // PocketBase's file storage keeps a metadata sidecar next to each file.
        await rm(`${zipPath}.attrs`, { force: true })
        summary.iceboxed++
        summary.bytes += file.size
        info(`  iceboxed ${id}/${file.name} (${formatBytes(file.size)})`)
      } catch (e) {
        summary.failed++
        error(`  failed ${id}/${file.name}`, e)
      }
    })

    /* ---------- Expiry pass ---------- */
    for (const path of expiredStubs) {
      await rm(path, { force: true })
        .then(() => summary.stubsDeleted++)
        .catch((e) => error(`  could not delete stub ${path}`, e))
    }
    for (const o of cleanup.expire) {
      await deleteBackupIceboxObject(remote, o.instanceId, o.zipName)
        .then(() => summary.objectsDeleted++)
        .catch((e) => error(`  could not delete ${o.instanceId}/${o.zipName}`, e))
    }

    /* ---------- Stub dates ---------- */
    for (const t of cleanup.touch) {
      const path = join(root, t.instanceId, `pb_data`, `backups`, iceboxStubName(t.zipName))
      await utimes(path, new Date(), new Date(t.mtimeMs))
        .then(() => summary.stubsRedated++)
        .catch((e) => error(`  could not re-date ${path}`, e))
    }

    /* ---------- Orphans and trash ---------- */
    if (!orphanGuardTripped) {
      await mapLimit(cleanup.orphans, concurrency, async (o) => {
        await trashBackupIceboxObject(remote, o.instanceId, o.zipName)
          .then(() => {
            summary.orphansTrashed++
            info(`  trashed orphan ${o.instanceId}/${o.zipName}`)
          })
          .catch((e) => error(`  could not trash ${o.instanceId}/${o.zipName}`, e))
      })
    }
    for (const o of trashExpired) {
      await deleteBackupIceboxObject(trashRemote, o.instanceId, o.zipName)
        .then(() => summary.trashDeleted++)
        .catch((e) => error(`  could not delete trash ${o.instanceId}/${o.zipName}`, e))
    }
  }

  info(
    `[${mode}] done: ${summary.iceboxed} iceboxed (${formatBytes(summary.bytes)} freed), ${summary.failed} failed, ` +
      `${summary.stubsDeleted} stubs and ${summary.objectsDeleted} stored zips expired, ` +
      `${summary.stubsRedated} stubs re-dated, ${summary.orphansTrashed} orphans trashed, ` +
      `${summary.trashDeleted} trashed zips deleted`
  )
  return summary
}
