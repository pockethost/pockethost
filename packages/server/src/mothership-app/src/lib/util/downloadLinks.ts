/**
 * Signed download links for archived instances (`/_ph/archive/:instanceId`) and cold-stored backups
 * (`/_ph/backup/:instanceId/:zipName`). The edge's `edge archive` jobs sign them (core/instanceArchive.ts,
 * core/backupIcebox.ts: HMAC-SHA256, base64url); the mothership verifies them and redirects to a short-lived
 * object-storage URL. Pure functions: the HMAC is passed in (`$security.hs256` in PocketBase, node:crypto in tests).
 */

/** HMAC-SHA256 of `text` with `secret`, as lowercase hex. */
export type HmacHex = (text: string, secret: string) => string

export type LinkCheck = { ok: true } | { ok: false; status: 400 | 403 | 410; reason: string }

const INSTANCE_ID_RE = /^[a-z0-9]{15}$/
const ZIP_NAME_RE = /^[A-Za-z0-9_.@-]{1,200}\.zip$/
const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

export const isInstanceId = (id: string) => INSTANCE_ID_RE.test(id)
export const isBackupZipName = (name: string) => ZIP_NAME_RE.test(name) && !name.includes('..')

/** Hex digest to unpadded base64url (what node's `digest('base64url')` returns). */
export const hexToBase64Url = (hex: string) => {
  const bytes: number[] = []
  for (let i = 0; i + 1 < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16))
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out += B64URL[(n >> 18) & 63]! + B64URL[(n >> 12) & 63]!
    if (i + 1 < bytes.length) out += B64URL[(n >> 6) & 63]!
    if (i + 2 < bytes.length) out += B64URL[n & 63]!
  }
  return out
}

/** Length-checked comparison that looks at every character. */
const sameString = (a: string, b: string) => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const check = (
  payload: string,
  expRaw: unknown,
  sigRaw: unknown,
  secret: string,
  nowMs: number,
  hmacHex: HmacHex
): LinkCheck => {
  if (typeof expRaw !== 'string' || typeof sigRaw !== 'string' || !/^\d+$/.test(expRaw)) {
    return { ok: false, status: 400, reason: 'malformed link' }
  }
  const expected = hexToBase64Url(hmacHex(`${payload}:${expRaw}`, secret))
  if (!sameString(expected, sigRaw)) return { ok: false, status: 403, reason: 'invalid signature' }
  if (nowMs > Number(expRaw) * 1000) return { ok: false, status: 410, reason: 'link expired' }
  return { ok: true }
}

export const verifyArchiveLink = (
  instanceId: string,
  expRaw: unknown,
  sigRaw: unknown,
  secret: string,
  nowMs: number,
  hmacHex: HmacHex
): LinkCheck => {
  if (!secret) return { ok: false, status: 403, reason: 'link signing is not configured' }
  if (!isInstanceId(instanceId)) return { ok: false, status: 400, reason: 'bad instance id' }
  return check(`archive:${instanceId}`, expRaw, sigRaw, secret, nowMs, hmacHex)
}

export const verifyBackupLink = (
  instanceId: string,
  zipName: string,
  expRaw: unknown,
  sigRaw: unknown,
  secret: string,
  nowMs: number,
  hmacHex: HmacHex
): LinkCheck => {
  if (!secret) return { ok: false, status: 403, reason: 'link signing is not configured' }
  if (!isInstanceId(instanceId)) return { ok: false, status: 400, reason: 'bad instance id' }
  if (!isBackupZipName(zipName)) return { ok: false, status: 400, reason: 'bad backup name' }
  return check(`backup:${instanceId}/${zipName}`, expRaw, sigRaw, secret, nowMs, hmacHex)
}

export const DOWNLOAD_MESSAGES: Record<number, string> = {
  400: 'This download link is malformed.',
  403: 'This download link is not valid.',
  404: 'This archive is no longer available.',
  410: 'This download link has expired, and the archive has been deleted.',
  500: 'Something went wrong preparing your download. Please try again or contact support.',
}
