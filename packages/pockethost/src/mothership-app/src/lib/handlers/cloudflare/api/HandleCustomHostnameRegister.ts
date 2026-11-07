import { ensureCustomHostname } from '$util/cloudflare'
import { mkLog } from '$util/Logger'

/**
 * POST /api/cloudflare/hostnames/register/{instanceId} (superuser). Re-adds an instance's cname, e.g. after an archive
 * restore.
 */
export const HandleCustomHostnameRegister = (e: core.RequestEvent) => {
  const log = mkLog(`cloudflare-hostname-register`)
  const record = $app.findRecordById('instances', e.request!.pathValue('id'))
  const cname = record.getString('cname').trim()
  if (!cname) return e.json(200, { status: 'no-cname' })
  const created = ensureCustomHostname(cname, log)
  return e.json(200, { status: created ? 'registered' : 'failed', cname })
}
