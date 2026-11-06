import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Stale free-plan instances are suspended and archived to object storage. The archived state lives entirely in
 * `instances.suspension` (prefix below) and the archive location is derived from the instance id, so no schema change
 * is needed.
 */

export const ARCHIVED_SUSPENSION_PREFIX = `Archived:`

export const MS_PER_DAY = 86_400_000

export const ARCHIVE_DEFAULTS = {
  staleDays: 365,
  retentionDays: 180,
} as const

export const mkArchivedSuspension = (deleteDate: Date) =>
  `${ARCHIVED_SUSPENSION_PREFIX} This instance was archived after 12 months of inactivity. ` +
  `Check your email for the download link (available until ${fmtDate(deleteDate)}), or contact support to restore it.`

export const mkArchiveExpiredSuspension = () =>
  `${ARCHIVED_SUSPENSION_PREFIX} This instance was archived after 12 months of inactivity, ` +
  `and the archive has since been deleted.`

export const isArchivedSuspension = (suspension: string | undefined | null) =>
  !!suspension && suspension.startsWith(ARCHIVED_SUSPENSION_PREFIX)

/*
 * Suspension history. A new reason goes on top and earlier reasons are kept below it, so
 * archiving an already-suspended instance keeps the operator's original reason, and a
 * restore pops back to it (the instance stays suspended for the original reason).
 */

export const SUSPENSION_HISTORY_SEPARATOR = `\n\nPreviously: `

export const pushSuspension = (reason: string, previous: string | undefined | null) =>
  previous ? `${reason}${SUSPENSION_HISTORY_SEPARATOR}${previous}` : reason

export const popSuspension = (suspension: string | undefined | null) => {
  const s = suspension ?? ``
  const i = s.indexOf(SUSPENSION_HISTORY_SEPARATOR)
  return i === -1 ? `` : s.slice(i + SUSPENSION_HISTORY_SEPARATOR.length)
}

export const fmtDate = (d: Date) => d.toISOString().slice(0, 10)

export const archiveObjectName = (instanceId: string) => `${instanceId}.tar.zst`

export const parseArchiveObjectName = (name: string): string | null => {
  const match = /^([a-z0-9]{15})\.tar\.zst$/.exec(name)
  return match?.[1] ?? null
}

export type StaleCandidateInput = {
  updated: string
  suspension: string
  owner: {
    subscription: string
    subscription_status?: string
    suspension: string
  }
}

export type StaleCandidateOptions = {
  /**
   * Lapsed owners used to pay. They're skipped by default: billing reconciliation can move a paying account to
   * free/lapsed, and that should settle before we archive.
   */
  includeLapsed?: boolean
}

/**
 * Free plan, not paying, not already archived, and no start for `staleDays`. Suspended instances and accounts are
 * included: suspension doesn't exempt data from the stale rules.
 */
export const isStaleCandidate = (
  i: StaleCandidateInput,
  nowMs: number,
  staleDays: number,
  { includeLapsed = false }: StaleCandidateOptions = {}
) => {
  if (isArchivedSuspension(i.suspension)) return false
  if (i.owner.subscription !== `free`) return false
  if (i.owner.subscription_status === `active`) return false
  if (i.owner.subscription_status === `lapsed` && !includeLapsed) return false
  const updatedMs = Date.parse(i.updated)
  if (!Number.isFinite(updatedMs)) return false
  return nowMs - updatedMs >= staleDays * MS_PER_DAY
}

export const isArchiveExpired = (archivedAtMs: number, nowMs: number, retentionDays: number) =>
  nowMs - archivedAtMs >= retentionDays * MS_PER_DAY

/* Signed download links. Presigned S3 URLs top out at 7 days, so emails carry a link
 * to our own endpoint, which checks this signature and redirects to a short-lived
 * presigned URL. */

const sign = (instanceId: string, expSec: number, secret: string) =>
  createHmac(`sha256`, secret).update(`archive:${instanceId}:${expSec}`).digest(`base64url`)

export const mkArchiveDownloadUrl = (origin: string, instanceId: string, expSec: number, secret: string) => {
  if (!secret) throw new Error(`Archive link secret is not configured`)
  const url = new URL(`/_ph/archive/${instanceId}`, origin)
  url.searchParams.set(`exp`, String(expSec))
  url.searchParams.set(`sig`, sign(instanceId, expSec, secret))
  return url.toString()
}

export type ArchiveLinkCheck = { ok: true } | { ok: false; status: 400 | 403 | 410; reason: string }

export const verifyArchiveLink = (
  instanceId: string,
  expRaw: unknown,
  sigRaw: unknown,
  secret: string,
  nowMs: number
): ArchiveLinkCheck => {
  if (!secret) return { ok: false, status: 403, reason: `link signing is not configured` }
  if (!/^[a-z0-9]{15}$/.test(instanceId)) return { ok: false, status: 400, reason: `bad instance id` }
  if (typeof expRaw !== `string` || typeof sigRaw !== `string` || !/^\d+$/.test(expRaw)) {
    return { ok: false, status: 400, reason: `malformed link` }
  }
  const expSec = Number(expRaw)
  const expected = Buffer.from(sign(instanceId, expSec, secret))
  const given = Buffer.from(sigRaw)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, status: 403, reason: `invalid signature` }
  }
  if (nowMs > expSec * 1000) return { ok: false, status: 410, reason: `link expired` }
  return { ok: true }
}
