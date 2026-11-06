import { mkLog } from '$util/Logger'
import { mkAudit } from '$util/mkAudit'
import { runReconcile, type ReconcileReport } from '../lib/runReconcile'

const auditReport = (report: ReconcileReport, who: string) => {
  const log = mkLog(`ls-reconcile`)
  mkAudit(log, $app)(
    `LS`,
    `Billing reconcile (${who}, ${report.mode}) applied: ${report.changed} changed, ${report.gained} gained, ` +
      `${report.reductions.filter((r) => !r.held).length} reduced, ${report.reductionsHeld} reductions held, ` +
      `${report.preserveReleased.length} unverified preserve rows released, ` +
      `${report.reassigned.filter((r) => !r.held).length} purchases moved to their checkout's account, ` +
      `${report.errors.length} errors.`,
    {
      reductions: report.reductions,
      preserveReleased: report.preserveReleased,
      reassigned: report.reassigned,
      affectedOutsideRun: report.affectedOutsideRun,
      errors: report.errors,
    }
  )
}

/**
 * Superuser: `POST /api/ls/reconcile` — dry run by default.
 *
 * - `apply=1` writes.
 * - `user=<id>` one user, exact recompute.
 * - `backfill=1` one-time mode that creates preserve rows instead of lowering anyone.
 * - `maxReductions=<n>` (default 25): above this many drops, all drops are held. See `runReconcile`.
 */
export const HandleLemonSqueezyReconcile = (e: core.RequestEvent) => {
  const q = e.request.url.query()
  const num = (k: string) => {
    const v = q.get(k)
    return v === `` ? undefined : Number(v)
  }
  const report = runReconcile({
    apply: q.get(`apply`) === `1`,
    onlyUserId: q.get(`user`) || undefined,
    backfill: q.get(`backfill`) === `1`,
    maxReductions: num(`maxReductions`),
  })
  if (!report.dryRun) auditReport(report, q.get(`user`) ? `user ${q.get(`user`)}` : `manual`)
  return e.json(200, report)
}
