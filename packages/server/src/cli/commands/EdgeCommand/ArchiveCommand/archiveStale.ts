import {
  ARCHIVE_DEFAULTS,
  ARCHIVE_REASON_SUPPORT,
  DISCORD_ALERT_CHANNEL_URL,
  INSTANCES_ROOT,
  InstanceFields,
  MS_PER_DAY,
  PH_ARCHIVE_LINK_ORIGIN,
  PH_ARCHIVE_LINK_SECRET,
  PH_ARCHIVE_REMOTE,
  PocketBase,
  UserFields,
  deleteInstanceArchive,
  dirHasAnyFile,
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
import { existsSync, rmSync } from 'fs'
import { resolve } from 'path'
import { connectMothership as connect, dirSizeBytes, formatBytes, mapLimit } from '../edgeUtils'
import { ARCHIVE_EMAIL_TEMPLATE } from './emailTemplate'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Time for the suspension to reach the edge daemon through the mothership mirror. */
const SUSPENSION_SETTLE_MS = 5000

const pbDate = (ms: number) => new Date(ms).toISOString().replace(`T`, ` `)

type Candidate = InstanceFields & { expand: { uid: UserFields } }
type Sized = { instance: Candidate; bytes: number }

export type ArchiveStaleOptions = {
  apply?: boolean
  staleDays?: number
  retentionDays?: number
  maxInstances?: number
  maxBytes?: number
  includeLapsed?: boolean
  /** Email each owner a download link. Off by default: archiving is quiet. */
  email?: boolean
  /** Instances suspended together; they share one settle wait and one container check. */
  batchSize?: number
  /** Uploads (and sizing) running at once. */
  concurrency?: number
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
  email = false,
  batchSize = 50,
  concurrency = 8,
}: ArchiveStaleOptions = {}): Promise<ArchiveStaleSummary> => {
  const { info, warn, error } = logger().create(`archiveStale`)
  const nowMs = Date.now()
  const remote = PH_ARCHIVE_REMOTE()
  const linkSecret = PH_ARCHIVE_LINK_SECRET()
  const linkOrigin = PH_ARCHIVE_LINK_ORIGIN()
  const instancesRoot = resolve(INSTANCES_ROOT())
  const mode = apply ? `APPLY` : `DRY RUN`

  if (email && !linkSecret) throw new Error(`PH_ARCHIVE_LINK_SECRET (or PH_SECRET) must be set to sign download links`)

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
    `[${mode}] remote=${remote} stale=${staleDays}d retention=${retentionDays}d caps=${maxInstances} instances / ${formatBytes(maxBytes)} batch=${batchSize} concurrency=${concurrency}${includeLapsed ? ` +lapsed` : ``} email=${email ? `on` : `off`}`
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

  const present: Candidate[] = []
  for (const instance of candidates) {
    if (!existsSync(mkInstanceDataPath(instance.id))) summary.noLocalData++
    else if (running.has(instance.id)) summary.running++
    else present.push(instance)
  }
  const sized = await mapLimit(present, concurrency, async (instance) => ({
    instance,
    bytes: await dirSizeBytes(mkInstanceDataPath(instance.id)),
  }))
  sized.sort((a, b) => b.bytes - a.bytes)
  info(`${sized.length} with local data; ${summary.noLocalData} without; ${summary.running} running (skipped)`)

  const templateId = email ? await ensureTemplate(pb, apply) : ``
  const deleteDate = new Date(nowMs + retentionDays * MS_PER_DAY)
  const mkLabel = ({ instance, bytes }: Sized) =>
    `${instance.subdomain} (${instance.id}, ${formatBytes(bytes)}, owner ${instance.expand.uid.email})`

  // Pick the work list up front so the caps apply the same way in dry runs and real runs.
  const selected: Sized[] = []
  let budgetBytes = maxBytes
  for (const item of sized) {
    if (selected.length >= maxInstances) break
    if (item.bytes > budgetBytes) continue
    selected.push(item)
    budgetBytes -= item.bytes
  }

  if (!apply) {
    for (const item of selected) {
      info(`  would archive: ${mkLabel(item)}`)
      summary.archived++
      summary.archivedBytes += item.bytes
    }
  }

  // SIGINT/SIGTERM finishes the batch in flight, then stops before the next one.
  let stopping = false
  const onSignal = (sig: string) => {
    if (!stopping) warn(`${sig}: finishing the current batch, then stopping`)
    stopping = true
  }
  const onInt = () => onSignal(`SIGINT`)
  const onTerm = () => onSignal(`SIGTERM`)
  if (apply) {
    process.on(`SIGINT`, onInt)
    process.on(`SIGTERM`, onTerm)
  }

  const revert = async (item: Sized) =>
    pb
      .collection(`instances`)
      .update(item.instance.id, { suspension: item.instance.suspension })
      .catch((e) => error(`  could not reset suspension for ${item.instance.id}`, e))

  try {
    for (let i = 0; apply && i < selected.length && !stopping; i += batchSize) {
      const batch = selected.slice(i, i + batchSize)

      // 1. Suspend the whole batch. An existing suspension (e.g. fair use) is kept underneath the archive reason,
      //    and put back on failure.
      const suspended = (
        await mapLimit(batch, concurrency, async (item) => {
          const { instance } = item
          try {
            // Re-read: skip anything that woke up or changed since the list was fetched.
            const fresh = await pb.collection(`instances`).getOne<InstanceFields>(instance.id)
            if (fresh.suspension !== instance.suspension || fresh.updated !== instance.updated) {
              info(`  skip (changed since scan): ${mkLabel(item)}`)
              return null
            }
            await pb.collection(`instances`).update(instance.id, {
              suspension: pushSuspension(mkArchivedSuspension(deleteDate, { emailed: email }), instance.suspension),
            })
            return item
          } catch (e) {
            summary.failed++
            error(`  FAILED to suspend: ${mkLabel(item)}`, e)
            await revert(item)
            return null
          }
        })
      ).filter((x): x is Sized => !!x)

      // 2. One wait for the whole batch to reach the edge daemon, then one container check.
      if (suspended.length === 0) continue
      await sleep(SUSPENSION_SETTLE_MS)
      const nowRunning = new Set((await listRunningInstanceContainers()).map((c) => c.instanceId))
      const ready: Sized[] = []
      for (const item of suspended) {
        if (!nowRunning.has(item.instance.id)) {
          ready.push(item)
          continue
        }
        await revert(item)
        info(`  skip (started during archive): ${mkLabel(item)}`)
        summary.running++
      }

      // 3. Upload, verify and delete in parallel.
      const archived = (
        await mapLimit(ready, concurrency, async (item) => {
          const { instance, bytes } = item
          try {
            const digest = await uploadInstanceArchive(instancesRoot, instance.id, remote)
            await verifyInstanceArchive(remote, instance.id, digest)
            rmSync(mkInstanceDataPath(instance.id), { recursive: true, force: true })
            summary.archived++
            summary.archivedBytes += bytes
            info(`  archived: ${mkLabel(item)} -> ${formatBytes(digest.bytes)} compressed`)
            return item
          } catch (e) {
            summary.failed++
            error(`  FAILED: ${mkLabel(item)}`, e)
            await revert(item)
            await deleteInstanceArchive(remote, instance.id).catch(() => {})
            return null
          }
        })
      ).filter((x): x is Sized => !!x)

      if (!email) continue
      for (const { instance, bytes } of archived) {
        try {
          const link = mkArchiveDownloadUrl(
            linkOrigin,
            instance.id,
            Math.floor(deleteDate.getTime() / 1000),
            linkSecret
          )
          const vars = {
            subdomain: instance.subdomain,
            size: formatBytes(bytes),
            link,
            deletedate: fmtDate(deleteDate),
          }
          await pb.collection(`notifications`).create({
            user: instance.expand.uid.id,
            channel: `email`,
            message_template: templateId,
            message_template_vars: vars,
            payload: vars,
          })
        } catch (e) {
          summary.emailFailed++
          error(`  email failed for ${instance.subdomain} (${instance.id})`, e)
        }
      }
    }
  } finally {
    process.off(`SIGINT`, onInt)
    process.off(`SIGTERM`, onTerm)
  }

  if (stopping) {
    info(
      `[archive-stale ${mode}] stopped early: ${summary.archived} archived (${formatBytes(summary.archivedBytes)} freed), ${summary.failed} failed`
    )
    return summary
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

/* ---------- Single instance ---------- */

export type ArchiveInstanceOptions = {
  apply?: boolean
  retentionDays?: number
  /** How long to wait for the edge daemon to stop the instance after suspending it. */
  stopTimeoutMs?: number
}

/**
 * Archive one instance on any plan (e.g. a fair-use case), the same way the stale job does: suspend, wait for it to
 * stop, upload, verify, delete local data. No email is sent; the signed download link is printed so it can go in a
 * personal reply. The daily stale job's expiry pass deletes the archive after the retention period.
 */
export const archiveInstance = async (
  instanceId: string,
  { apply = false, retentionDays = ARCHIVE_DEFAULTS.retentionDays, stopTimeoutMs = 60_000 }: ArchiveInstanceOptions = {}
) => {
  const { info } = logger().create(`archiveInstance`)
  const mode = apply ? `APPLY` : `DRY RUN`
  const remote = PH_ARCHIVE_REMOTE()
  const linkSecret = PH_ARCHIVE_LINK_SECRET()
  if (!linkSecret) throw new Error(`PH_ARCHIVE_LINK_SECRET (or PH_SECRET) must be set to sign download links`)

  const pb = await connect()
  const instance = await pb.collection(`instances`).getOne<Candidate>(instanceId, { expand: `uid` })
  if (isArchivedSuspension(instance.suspension))
    throw new Error(`${instance.subdomain} (${instanceId}) is already archived`)
  const dir = mkInstanceDataPath(instanceId)
  if (!existsSync(dir)) throw new Error(`${dir} does not exist; nothing to archive`)

  const bytes = await dirSizeBytes(dir)
  const owner = instance.expand?.uid
  const label = `${instance.subdomain} (${instanceId}, ${formatBytes(bytes)}, owner ${owner?.email ?? instance.uid}, plan ${owner?.subscription ?? `?`})`
  const deleteDate = new Date(Date.now() + retentionDays * MS_PER_DAY)
  info(`[${mode}] ${label} -> ${remote}, archive kept until ${fmtDate(deleteDate)}`)
  if (!apply) return

  const revert = () =>
    pb
      .collection(`instances`)
      .update(instanceId, { suspension: instance.suspension })
      .catch((e) => logger().create(`archiveInstance`).error(`could not reset suspension for ${instanceId}`, e))

  await pb.collection(`instances`).update(instanceId, {
    suspension: pushSuspension(
      mkArchivedSuspension(deleteDate, { reason: ARCHIVE_REASON_SUPPORT }),
      instance.suspension
    ),
  })
  info(`Suspended; waiting for it to stop`)

  // A suspended instance is stopped by the edge daemon once the change reaches it through the mothership mirror.
  const deadline = Date.now() + stopTimeoutMs
  await sleep(SUSPENSION_SETTLE_MS)
  while ((await listRunningInstanceContainers()).some((c) => c.instanceId === instanceId)) {
    if (Date.now() > deadline) {
      await revert()
      throw new Error(`${instanceId} is still running after ${stopTimeoutMs}ms; suspension reverted`)
    }
    await sleep(2000)
  }

  try {
    const digest = await uploadInstanceArchive(resolve(INSTANCES_ROOT()), instanceId, remote)
    await verifyInstanceArchive(remote, instanceId, digest)
    rmSync(dir, { recursive: true, force: true })
    const link = mkArchiveDownloadUrl(
      PH_ARCHIVE_LINK_ORIGIN(),
      instanceId,
      Math.floor(deleteDate.getTime() / 1000),
      linkSecret
    )
    const line = `[archive-instance] archived ${label} -> ${formatBytes(digest.bytes)} compressed`
    info(line)
    info(`Download link (works until ${fmtDate(deleteDate)}):\n${link}`)
    info(`Restore with: pnpm prod:cli edge archive restore ${instanceId}`)
    await postDiscord(line)
  } catch (e) {
    await revert()
    await deleteInstanceArchive(remote, instanceId).catch(() => {})
    throw e
  }
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
  if (existsSync(dir)) {
    // An empty skeleton (recreated by older mirror code) is fine to replace; real data is not.
    if (dirHasAnyFile(mkInstanceDataPath(instanceId, `pb_data`))) {
      throw new Error(`${dir}/pb_data already has files; refusing to overwrite`)
    }
    info(`Removing empty skeleton folder ${dir}`)
    rmSync(dir, { recursive: true, force: true })
  }

  info(`Restoring ${instance.subdomain} (${instanceId}) from ${PH_ARCHIVE_REMOTE()}`)
  await downloadInstanceArchive(PH_ARCHIVE_REMOTE(), instanceId, resolve(INSTANCES_ROOT()))
  // Pop the archive reason; any earlier suspension (e.g. fair use) comes back into force.
  const previous = popSuspension(instance.suspension)
  await pb.collection(`instances`).update(instanceId, { suspension: previous })
  info(`Restored. The archive stays in storage until its retention period ends.`)
  if (previous) info(`The instance is still suspended for its earlier reason: ${JSON.stringify(previous)}`)
  if (instance.cname?.trim()) {
    // The daily sweep removed its Cloudflare custom hostname while archived; put it back.
    const res = await pb
      .send(`/api/cloudflare/hostnames/register/${instanceId}`, { method: `POST` })
      .catch((e: unknown) => ({ status: `failed`, error: `${e}` }))
    info(`Custom domain ${instance.cname}: ${JSON.stringify(res)}`)
  }
  const owner = await pb.collection(`users`).getOne<UserFields>(instance.uid)
  if (owner.suspension) info(`The owner's account is suspended: ${JSON.stringify(owner.suspension)}`)
}
