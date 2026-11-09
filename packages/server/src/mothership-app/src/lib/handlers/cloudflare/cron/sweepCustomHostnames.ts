import {
  deleteCustomHostnameById,
  isDeadHostname,
  listCustomHostnames,
  type CustomHostname,
} from '../../../util/cloudflare'
import { mkLog } from '../../../util/Logger'

/** Matches ARCHIVED_SUSPENSION_PREFIX in core/instanceArchive.ts (not importable from the JSVM bundle). */
const ARCHIVED_PREFIX = 'Archived:'
const PENDING_GRACE_DAYS = 14
const IGNORED_STATUSES = ['deleted', 'pending_deletion']
const OWN_ZONE_SUFFIX = '.pockethost.io'
/** If a run would delete more than this share of all hostnames, something is wrong (e.g. a bad DB read). */
const MAX_DELETE_RATIO = 0.5

export type SweepDecision = { hostname: string; id: string; status: string; ssl: string; reason: string }

export type SweepResult = {
  apply: boolean
  total: number
  kept: number
  toDelete: SweepDecision[]
  deleted: number
  failed: string[]
  /** Live instances whose cname Cloudflare doesn't have. Logged only, never auto-created. */
  missing: string[]
  aborted?: string
}

const norm = (h: string) => h.trim().toLowerCase()

/** Why a hostname should go, or null to keep it. Pure, so it's easy to reason about. */
export const reasonToDelete = (
  h: CustomHostname,
  owner: { suspension: string } | undefined,
  now: number
): string | null => {
  const ssl = h.ssl?.status || ''
  if (!owner) return 'orphan'
  if (owner.suspension.startsWith(ARCHIVED_PREFIX)) return 'archived'
  if (isDeadHostname(h)) return `dead (${h.status}/${ssl})`
  // An active hostname whose cert is mid-renewal (pending_*) is kept; only never-activated ones age out.
  if (h.status !== 'active') {
    const ageDays = (now - new Date(h.created_at).getTime()) / 86_400_000
    if (ageDays > PENDING_GRACE_DAYS) return `not active after ${PENDING_GRACE_DAYS} days (${h.status}/${ssl})`
  }
  return null
}

export const sweepCustomHostnames = (apply: boolean): SweepResult => {
  const log = mkLog(`cloudflare-hostnames`)

  const listed = listCustomHostnames(log)
  if (!listed) throw new Error(`Could not list Cloudflare custom hostnames`)
  // Already deleted (Cloudflare keeps listing them for a while; not billed) and our own zone's
  // subdomains (routed by subdomain, not cname) are out of scope.
  const hostnames = listed.filter(
    (h) => !IGNORED_STATUSES.includes(h.status) && !norm(h.hostname).endsWith(OWN_ZONE_SUFFIX)
  )

  const owners = new Map<string, { suspension: string }>()
  $app.findRecordsByFilter('instances', "cname != ''", '', 0, 0).forEach((r) => {
    if (!r) return
    const cname = norm(r.getString('cname'))
    if (cname) owners.set(cname, { suspension: r.getString('suspension') })
  })

  const now = Date.now()
  const toDelete: SweepDecision[] = []
  const inCloudflare = new Set<string>()
  for (const h of hostnames) {
    const name = norm(h.hostname)
    inCloudflare.add(name)
    const reason = reasonToDelete(h, owners.get(name), now)
    if (reason) toDelete.push({ hostname: h.hostname, id: h.id, status: h.status, ssl: h.ssl?.status || '', reason })
  }

  const missing = [...owners.entries()]
    .filter(([name, o]) => !inCloudflare.has(name) && !o.suspension.startsWith(ARCHIVED_PREFIX))
    .map(([name]) => name)

  const result: SweepResult = {
    apply,
    total: hostnames.length,
    kept: hostnames.length - toDelete.length,
    toDelete,
    deleted: 0,
    failed: [],
    missing,
  }

  if (apply && hostnames.length > 0 && toDelete.length / hostnames.length > MAX_DELETE_RATIO) {
    result.aborted = `Would delete ${toDelete.length} of ${hostnames.length} (over ${MAX_DELETE_RATIO * 100}%). Not deleting; review with a dry run.`
  } else if (apply) {
    for (const d of toDelete) {
      if (deleteCustomHostnameById(d.id, log)) result.deleted++
      else result.failed.push(d.hostname)
    }
  }

  const byReason: Record<string, number> = {}
  toDelete.forEach((d) => {
    const key = d.reason.split(' (')[0]!
    byReason[key] = (byReason[key] || 0) + 1
  })
  log(`${apply ? 'APPLY' : 'DRY RUN'}: ${result.total} hostnames, keep ${result.kept}, delete ${toDelete.length}`, {
    byReason,
    deleted: result.deleted,
    failed: result.failed,
    missing: missing.length,
    aborted: result.aborted,
  })
  return result
}

/** Daily cron. Deletes only when MOTHERSHIP_CLOUDFLARE_SWEEP_APPLY is true; otherwise logs a dry run. */
export const cronSweepCustomHostnames = () => {
  const apply = ['1', 'true', 'yes'].includes(($os.getenv('MOTHERSHIP_CLOUDFLARE_SWEEP_APPLY') || '').toLowerCase())
  try {
    sweepCustomHostnames(apply)
  } catch (e) {
    mkLog(`cloudflare-hostnames`)(`Sweep failed:`, `${e}`)
  }
}
