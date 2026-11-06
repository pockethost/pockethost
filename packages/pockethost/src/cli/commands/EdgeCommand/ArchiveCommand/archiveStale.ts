import {
  ARCHIVE_DEFAULTS,
  DISCORD_ALERT_CHANNEL_URL,
  INSTANCES_ROOT,
  InstanceFields,
  LoggerService,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_URL,
  MS_PER_DAY,
  MothershipAdminClientService,
  PH_ARCHIVE_LINK_ORIGIN,
  PH_ARCHIVE_LINK_SECRET,
  PH_ARCHIVE_REMOTE,
  PocketBase,
  UserFields,
  deleteInstanceArchive,
  downloadInstanceArchive,
  fmtDate,
  isArchiveExpired,
  isArchivedSuspension,
  isStaleCandidate,
  listInstanceArchives,
  listRunningInstanceContainers,
  logger,
  mkArchiveDownloadUrl,
  mkArchiveExpiredSuspension,
  mkArchivedSuspension,
  mkInstanceDataPath,
  parseArchiveObjectName,
  popSuspension,
  pushSuspension,
  uploadInstanceArchive,
  verifyInstanceArchive,
} from '@'
import { execFile } from 'child_process'
import { existsSync, rmSync } from 'fs'
import { resolve } from 'path'
import { promisify } from 'util'
import { ARCHIVE_EMAIL_TEMPLATE } from './emailTemplate'

const execFileAsync = promisify(execFile)
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Time for the suspension to reach the edge daemon through the mothership mirror. */
const SUSPENSION_SETTLE_MS = 5000

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

const pbDate = (ms: number) => new Date(ms).toISOString().replace(`T`, ` `)

const dirSizeBytes = async (dir: string) => {
  const { stdout } = await execFileAsync(`nice`, [`-n`, `19`, `du`, `-sk`, dir])
  return parseInt(stdout.split(`\t`)[0] ?? `0`, 10) * 1024
}

const connect = async () => {
  const { client } = await MothershipAdminClientService({
    url: MOTHERSHIP_URL(),
    username: MOTHERSHIP_ADMIN_USERNAME(),
    password: MOTHERSHIP_ADMIN_PASSWORD(),
    logger: LoggerService(),
  })
  return client.client as PocketBase
}

type Candidate = InstanceFields & { expand: { uid: UserFields } }

export type ArchiveStaleOptions = {
  apply?: boolean
  staleDays?: number
  retentionDays?: number
  maxInstances?: number
  maxBytes?: number
  includeLapsed?: boolean
}

export type ArchiveStaleSummary = {
  candidates: number
  noLocalData: number
  running: number
  archived: number
  archivedBytes: number
  failed: number
  emailFailed: number
  expired: number
  orphansDeleted: number
}

export const archiveStaleInstances = async ({
  apply = false,
  staleDays = ARCHIVE_DEFAULTS.staleDays,
  retentionDays = ARCHIVE_DEFAULTS.retentionDays,
  maxInstances = 200,
  maxBytes = 100 * 1024 ** 3,
  includeLapsed = false,
}: ArchiveStaleOptions = {}): Promise<ArchiveStaleSummary> => {
  const { info, warn, error } = logger().create(`archiveStale`)
  const nowMs = Date.now()
  const remote = PH_ARCHIVE_REMOTE()
  const linkSecret = PH_ARCHIVE_LINK_SECRET()
  const linkOrigin = PH_ARCHIVE_LINK_ORIGIN()
  const instancesRoot = resolve(INSTANCES_ROOT())
  const mode = apply ? `APPLY` : `DRY RUN`

  if (!linkSecret) throw new Error(`PH_ARCHIVE_LINK_SECRET (or PH_SECRET) must be set to sign download links`)

  const summary: ArchiveStaleSummary = {
    candidates: 0,
    noLocalData: 0,
    running: 0,
    archived: 0,
    archivedBytes: 0,
    failed: 0,
    emailFailed: 0,
    expired: 0,
    orphansDeleted: 0,
  }

  info(
    `[${mode}] remote=${remote} stale=${staleDays}d retention=${retentionDays}d caps=${maxInstances} instances / ${formatBytes(maxBytes)}${includeLapsed ? ` +lapsed` : ``}`
  )

  const pb = await connect()

  const totalInstances = (await pb.collection(`instances`).getList(1, 1)).totalItems
  if (totalInstances === 0) {
    warn(`Mothership returned zero instances. Aborting without touching anything.`)
    return summary
  }

  /* ---------- Archive pass ---------- */

  const cutoff = pbDate(nowMs - staleDays * MS_PER_DAY)
  const fetched = await pb.collection(`instances`).getFullList<Candidate>({
    // Suspended instances and accounts are included; isStaleCandidate skips ones already archived.
    filter: `updated < "${cutoff}" && uid.subscription = "free"`,
    expand: `uid`,
    batch: 1000,
  })
  const candidates = fetched.filter(
    (i) => i.expand?.uid && isStaleCandidate({ ...i, owner: i.expand.uid }, nowMs, staleDays, { includeLapsed })
  )
  summary.candidates = candidates.length
  info(`${candidates.length} stale free instance(s) (of ${totalInstances} total)`)

  const running = new Set((await listRunningInstanceContainers()).map((c) => c.instanceId))

  const sized: Array<{ instance: Candidate; bytes: number }> = []
  for (const instance of candidates) {
    const dir = mkInstanceDataPath(instance.id)
    if (!existsSync(dir)) {
      summary.noLocalData++
      continue
    }
    if (running.has(instance.id)) {
      summary.running++
      continue
    }
    sized.push({ instance, bytes: await dirSizeBytes(dir) })
  }
  sized.sort((a, b) => b.bytes - a.bytes)
  info(`${sized.length} with local data; ${summary.noLocalData} without; ${summary.running} running (skipped)`)

  const templateId = await ensureTemplate(pb, apply)

  let budgetBytes = maxBytes
  for (const { instance, bytes } of sized) {
    if (summary.archived + summary.failed >= maxInstances) break
    if (bytes > budgetBytes) continue
    const owner = instance.expand.uid
    const label = `${instance.subdomain} (${instance.id}, ${formatBytes(bytes)}, owner ${owner.email})`

    if (!apply) {
      info(`  would archive: ${label}`)
      summary.archived++
      summary.archivedBytes += bytes
      budgetBytes -= bytes
      continue
    }

    const deleteDate = new Date(nowMs + retentionDays * MS_PER_DAY)
    // An existing suspension (e.g. fair use) is kept underneath the archive reason, and put back on failure.
    const previousSuspension = instance.suspension
    try {
      // Re-read: skip anything that woke up or changed since the list was fetched.
      const fresh = await pb.collection(`instances`).getOne<InstanceFields>(instance.id)
      if (fresh.suspension !== previousSuspension || fresh.updated !== instance.updated) {
        info(`  skip (changed since scan): ${label}`)
        continue
      }

      await pb
        .collection(`instances`)
        .update(instance.id, { suspension: pushSuspension(mkArchivedSuspension(deleteDate), previousSuspension) })
      await sleep(SUSPENSION_SETTLE_MS)
      if ((await listRunningInstanceContainers()).some((c) => c.instanceId === instance.id)) {
        await pb.collection(`instances`).update(instance.id, { suspension: previousSuspension })
        info(`  skip (started during archive): ${label}`)
        summary.running++
        continue
      }

      const digest = await uploadInstanceArchive(instancesRoot, instance.id, remote)
      await verifyInstanceArchive(remote, instance.id, digest)
      rmSync(mkInstanceDataPath(instance.id), { recursive: true, force: true })

      summary.archived++
      summary.archivedBytes += bytes
      budgetBytes -= bytes
      info(`  archived: ${label} -> ${formatBytes(digest.bytes)} compressed`)
    } catch (e) {
      summary.failed++
      error(`  FAILED: ${label}`, e)
      await pb
        .collection(`instances`)
        .update(instance.id, { suspension: previousSuspension })
        .catch((e2) => error(`  could not reset suspension for ${instance.id}`, e2))
      await deleteInstanceArchive(remote, instance.id).catch(() => {})
      continue
    }

    try {
      const link = mkArchiveDownloadUrl(linkOrigin, instance.id, Math.floor(deleteDate.getTime() / 1000), linkSecret)
      const vars = { subdomain: instance.subdomain, size: formatBytes(bytes), link, deletedate: fmtDate(deleteDate) }
      await pb.collection(`notifications`).create({
        user: owner.id,
        channel: `email`,
        message_template: templateId,
        message_template_vars: vars,
        payload: vars,
      })
    } catch (e) {
      summary.emailFailed++
      error(`  email failed for ${label}`, e)
    }
  }

  /* ---------- Expiry pass ---------- */

  const archives = await listInstanceArchives(remote)
  const existingIds = new Set(
    (await pb.collection(`instances`).getFullList<{ id: string }>({ fields: `id`, batch: 1000 })).map((i) => i.id)
  )
  if (existingIds.size === 0) {
    warn(`Mothership returned zero instance ids; skipping the expiry pass.`)
  } else {
    for (const archive of archives) {
      const id = parseArchiveObjectName(archive.name)
      if (!id) continue
      const orphan = !existingIds.has(id)
      const expired = isArchiveExpired(archive.modTimeMs, nowMs, retentionDays)
      if (!orphan && !expired) continue
      const why = orphan ? `instance deleted` : `older than ${retentionDays}d`
      if (!apply) {
        info(`  would delete archive ${archive.name} (${why})`)
      } else {
        try {
          await deleteInstanceArchive(remote, id)
          if (!orphan) {
            const inst = await pb.collection(`instances`).getOne<InstanceFields>(id)
            if (isArchivedSuspension(inst.suspension)) {
              await pb
                .collection(`instances`)
                .update(id, { suspension: pushSuspension(mkArchiveExpiredSuspension(), inst.suspension) })
            }
          }
          info(`  deleted archive ${archive.name} (${why})`)
        } catch (e) {
          error(`  failed to delete archive ${archive.name}`, e)
          continue
        }
      }
      if (orphan) summary.orphansDeleted++
      else summary.expired++
    }
  }

  const line =
    `[archive-stale ${mode}] ${summary.archived} archived (${formatBytes(summary.archivedBytes)} freed), ` +
    `${summary.failed} failed, ${summary.emailFailed} email failures, ${summary.expired} expired, ` +
    `${summary.orphansDeleted} orphan archives, ${summary.candidates} candidates`
  info(line)
  if (apply) await postDiscord(line)
  return summary
}

const ensureTemplate = async (pb: PocketBase, apply: boolean): Promise<string> => {
  const { info } = logger().create(`archiveStale:template`)
  try {
    const existing = await pb
      .collection(`message_templates`)
      .getFirstListItem<{ id: string }>(`slug = "${ARCHIVE_EMAIL_TEMPLATE.slug}"`)
    return existing.id
  } catch {
    if (!apply) {
      info(`message template "${ARCHIVE_EMAIL_TEMPLATE.slug}" is missing; it will be created on --apply`)
      return ``
    }
    const created = await pb.collection(`message_templates`).create<{ id: string }>(ARCHIVE_EMAIL_TEMPLATE)
    info(`created message template "${ARCHIVE_EMAIL_TEMPLATE.slug}"`)
    return created.id
  }
}

const postDiscord = async (content: string) => {
  const url = DISCORD_ALERT_CHANNEL_URL()
  if (!url) return
  await fetch(url, {
    method: `POST`,
    headers: { 'Content-Type': `application/json` },
    body: JSON.stringify({ content }),
  }).catch(() => {})
}

/* ---------- Restore ---------- */

export const restoreArchivedInstance = async (instanceId: string) => {
  const { info } = logger().create(`archiveRestore`)
  const pb = await connect()
  const instance = await pb.collection(`instances`).getOne<InstanceFields>(instanceId)
  if (!isArchivedSuspension(instance.suspension)) {
    throw new Error(
      `${instance.subdomain} (${instanceId}) is not archived (suspension: ${JSON.stringify(instance.suspension)})`
    )
  }
  const dir = mkInstanceDataPath(instanceId)
  if (existsSync(dir)) throw new Error(`${dir} already exists; refusing to overwrite`)

  info(`Restoring ${instance.subdomain} (${instanceId}) from ${PH_ARCHIVE_REMOTE()}`)
  await downloadInstanceArchive(PH_ARCHIVE_REMOTE(), instanceId, resolve(INSTANCES_ROOT()))
  // Pop the archive reason; any earlier suspension (e.g. fair use) comes back into force.
  const previous = popSuspension(instance.suspension)
  await pb.collection(`instances`).update(instanceId, { suspension: previous })
  info(`Restored. The archive stays in storage until its retention period ends.`)
  if (previous) info(`The instance is still suspended for its earlier reason: ${JSON.stringify(previous)}`)
  const owner = await pb.collection(`users`).getOne<UserFields>(instance.uid)
  if (owner.suspension) info(`The owner's account is suspended: ${JSON.stringify(owner.suspension)}`)
}
