import { mkLog } from '$util/Logger'
import { verifyArchiveLink } from '$util/downloadLinks'
import { archiveLocation, hmacHex, linkSecret, redirectToObject, sendFailure } from './downloadHelpers'

/** GET /_ph/archive/{id}?exp=&sig= : signed link from the instance-archived email. */
export const HandleArchiveDownload = (e: core.RequestEvent) => {
  const log = mkLog(`downloads:archive`)
  const instanceId = e.request!.pathValue('id')
  const q = e.request!.url!.query()
  const check = verifyArchiveLink(instanceId, q.get('exp'), q.get('sig'), linkSecret(), Date.now(), hmacHex)
  if (!check.ok) {
    log(`rejected ${instanceId}: ${check.reason}`)
    return sendFailure(e, check.status)
  }
  const { bucket, prefix } = archiveLocation()
  return redirectToObject(e, instanceId, bucket, `${prefix ? prefix + '/' : ''}${instanceId}.tar.zst`)
}
