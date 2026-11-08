import {
  BACKUP_ICEBOX_DEFAULTS,
  BackupFile,
  INSTANCES_ROOT,
  LoggerService,
  MS_PER_DAY,
  PH_ARCHIVE_LINK_ORIGIN,
  PH_ARCHIVE_LINK_SECRET,
  PH_BACKUP_ICEBOX_REMOTE,
  backupLinkExpSec,
  deleteBackupIceboxObject,
  iceboxStubName,
  isIceboxStub,
  listBackupIcebox,
  mkBackupDownloadUrl,
  mkIceboxStub,
  planBackupIcebox,
  uploadBackupZip,
  verifyBackupZip,
} from '@'
import { existsSync } from 'fs'
import { chown, open, readdir, rename, rm, stat, writeFile } from 'fs/promises'
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

const readFirstLine = async (path: string) => {
  const fh = await open(path, `r`)
  try {
    const buf = Buffer.alloc(64)
    const { bytesRead } = await fh.read(buf, 0, 64, 0)
    return buf.subarray(0, bytesRead).toString(`utf8`).split(`\n`)[0] ?? ``
  } finally {
    await fh.close()
  }
}

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
 * storage, leaving a `.zip.txt` stub with a signed download link. Also deletes stubs and stored zips past retention.
 */
export const archiveBackups = async ({
  apply,
  retentionDays = BACKUP_ICEBOX_DEFAULTS.retentionDays,
  minAgeMinutes = BACKUP_ICEBOX_DEFAULTS.minAgeMinutes,
  maxBytes = Infinity,
  concurrency = 4,
  instanceId,
}: ArchiveBackupsOptions) => {
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
    for (const f of files) {
      if (!f.name.endsWith(`.zip.txt`) || nowMs - f.mtimeMs < retentionMs) continue
      const path = join(dir, f.name)
      if (isIceboxStub(f.name, await readFirstLine(path).catch(() => ``))) expiredStubs.push(path)
    }
  }

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
  for (const item of selected.slice(0, 20)) {
    info(`  ${item.instanceId}/${item.file.name} ${formatBytes(item.file.size)}`)
  }
  if (selected.length > 20) info(`  ...and ${selected.length - 20} more`)

  const summary = { iceboxed: 0, bytes: 0, failed: 0, stubsDeleted: 0, objectsDeleted: 0 }

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
    if (!instanceId) {
      const objects = await listBackupIcebox(remote)
      for (const o of objects) {
        if (nowMs - o.modTimeMs < retentionMs) continue
        await deleteBackupIceboxObject(remote, o.instanceId, o.zipName)
          .then(() => summary.objectsDeleted++)
          .catch((e) => error(`  could not delete ${o.instanceId}/${o.zipName}`, e))
      }
    }
  }

  info(
    `[${mode}] done: ${summary.iceboxed} iceboxed (${formatBytes(summary.bytes)} freed), ${summary.failed} failed, ` +
      `${summary.stubsDeleted} stubs and ${summary.objectsDeleted} stored zips expired`
  )
  return summary
}
