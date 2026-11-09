import { mkLog } from '$util/Logger'
import { verifyBackupLink } from '$util/downloadLinks'
import { backupLocation, hmacHex, linkSecret, redirectToObject, sendFailure } from './downloadHelpers'

/** GET /_ph/backup/{id}/{zip}?exp=&sig= : signed link from a cold-storage `.zip.txt` stub. */
export const HandleBackupDownload = (e: core.RequestEvent) => {
  const log = mkLog(`downloads:backup`)
  const instanceId = e.request!.pathValue('id')
  const zipName = e.request!.pathValue('zip')
  const q = e.request!.url!.query()
  const check = verifyBackupLink(instanceId, zipName, q.get('exp'), q.get('sig'), linkSecret(), Date.now(), hmacHex)
  if (!check.ok) {
    log(`rejected backup ${instanceId}/${zipName}: ${check.reason}`)
    return sendFailure(e, check.status)
  }
  const { bucket, prefix } = backupLocation()
  return redirectToObject(
    e,
    `${instanceId}/${zipName}`,
    bucket,
    `${prefix ? prefix + '/' : ''}${instanceId}/${zipName}`
  )
}
