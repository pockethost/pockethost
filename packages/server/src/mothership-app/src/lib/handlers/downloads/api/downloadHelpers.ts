import { mkLog } from '$util/Logger'
import { DOWNLOAD_MESSAGES } from '$util/downloadLinks'
import { parseRemote, presignUrl } from '$util/s3Presign'

const env = (key: string, fallback = '') => $os.getenv(key) || fallback

export const linkSecret = () => env('PH_ARCHIVE_LINK_SECRET') || env('PH_SECRET')
export const hmacHex = (text: string, secret: string) => $security.hs256(text, secret)

/** Where archives and cold-stored backups live (same `remote:bucket/prefix` settings the edge jobs use). */
export const archiveLocation = () => parseRemote(env('PH_ARCHIVE_REMOTE', 'sfo-2-data:sfo-2-data/archive'))
export const backupLocation = () => parseRemote(env('PH_BACKUP_ICEBOX_REMOTE', 'sfo-2-data:sfo-2-data/backup-icebox'))

export const sendFailure = (e: core.RequestEvent, status: number) =>
  e.string(status, DOWNLOAD_MESSAGES[status] ?? DOWNLOAD_MESSAGES[500]!)

/**
 * Checks the object exists (signed HEAD), then redirects to a 1-hour signed GET URL, so the file never streams through
 * PocketHost. Credentials: PH_DOWNLOADS_S3_ENDPOINT, PH_DOWNLOADS_S3_ACCESS_KEY, PH_DOWNLOADS_S3_SECRET,
 * PH_DOWNLOADS_S3_REGION (default us-east-1).
 */
export const redirectToObject = (e: core.RequestEvent, label: string, bucket: string, key: string) => {
  const log = mkLog(`downloads`)
  const endpoint = env('PH_DOWNLOADS_S3_ENDPOINT')
  const accessKeyId = env('PH_DOWNLOADS_S3_ACCESS_KEY')
  const secretAccessKey = env('PH_DOWNLOADS_S3_SECRET')
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    log(`downloads storage is not configured`)
    return sendFailure(e, 500)
  }
  const base = {
    endpoint: /^https?:\/\//.test(endpoint) ? endpoint : `https://${endpoint}`,
    region: env('PH_DOWNLOADS_S3_REGION', 'us-east-1'),
    accessKeyId,
    secretAccessKey,
    bucket,
    key,
    nowMs: Date.now(),
    sha256Hex: (text: string) => $security.sha256(text),
  }
  try {
    const head = $http.send({
      url: presignUrl({ ...base, method: 'HEAD', expiresSec: 60 }),
      method: 'HEAD',
      timeout: 15,
    })
    if (head.statusCode === 404) return sendFailure(e, 404)
    if (head.statusCode < 200 || head.statusCode >= 300) {
      log(`storage check failed for ${label}: HTTP ${head.statusCode}`)
      return sendFailure(e, 500)
    }
  } catch (err) {
    log(`storage check failed for ${label}: ${err}`)
    return sendFailure(e, 500)
  }
  log(`download ${label}`)
  return e.redirect(302, presignUrl({ ...base, method: 'GET', expiresSec: 3600 }))
}
