/**
 * Unsubscribe tokens, byte-for-byte the same as PocketBase CE ext/bulkmail (suppress.go), so links mailed by the legacy
 * mothership keep working after the CE plugin takes over (it reads the same secret from _params "bulkmail"):
 *
 * Base64url(email + "\n" + campaignId) + "." + base64url(first 16 bytes of HMAC-SHA256(secret, payload))
 */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

const utf8 = (s: string): number[] => {
  const out: number[] = []
  for (const ch of s) {
    let c = ch.codePointAt(0)!
    if (c < 0x80) out.push(c)
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63))
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
  }
  return out
}

const fromUtf8 = (b: number[]): string => {
  let s = ''
  for (let i = 0; i < b.length; ) {
    const c = b[i]!
    let cp: number
    if (c < 0x80) ((cp = c), (i += 1))
    else if (c < 0xe0) ((cp = ((c & 31) << 6) | (b[i + 1]! & 63)), (i += 2))
    else if (c < 0xf0) ((cp = ((c & 15) << 12) | ((b[i + 1]! & 63) << 6) | (b[i + 2]! & 63)), (i += 3))
    else ((cp = ((c & 7) << 18) | ((b[i + 1]! & 63) << 12) | ((b[i + 2]! & 63) << 6) | (b[i + 3]! & 63)), (i += 4))
    s += String.fromCodePoint(cp)
  }
  return s
}

export const b64url = (bytes: number[]): string => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    s += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!
    if (i + 1 < bytes.length) s += B64[(n >> 6) & 63]!
    if (i + 2 < bytes.length) s += B64[n & 63]!
  }
  return s
}

export const b64urlDecode = (s: string): number[] | null => {
  const out: number[] = []
  let buf = 0
  let bits = 0
  for (const ch of s) {
    const v = B64.indexOf(ch)
    if (v < 0) return null
    buf = (buf << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out.push((buf >> bits) & 255)
    }
  }
  return out
}

const hexBytes = (hex: string): number[] => {
  const out: number[] = []
  for (let i = 0; i + 1 < hex.length; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16))
  return out
}

/** Hs256 is $security.hs256 in the mothership (hex HMAC-SHA256); injectable for tests. */
export type Hs256 = (text: string, secret: string) => string

export const unsubscribeToken = (hs256: Hs256, secret: string, email: string, campaignId: string) => {
  const payload = `${email}`.trim().toLowerCase() + '\n' + campaignId
  return b64url(utf8(payload)) + '.' + b64url(hexBytes(hs256(payload, secret)).slice(0, 16))
}

export const parseUnsubscribeToken = (
  hs256: Hs256,
  secret: string,
  token: string
): { email: string; campaignId: string } | null => {
  const dot = token.indexOf('.')
  if (dot < 0) return null
  const raw = b64urlDecode(token.slice(0, dot))
  if (!raw) return null
  const payload = fromUtf8(raw)
  const nl = payload.indexOf('\n')
  const email = nl < 0 ? payload : payload.slice(0, nl)
  const campaignId = nl < 0 ? '' : payload.slice(nl + 1)
  if (!email.includes('@')) return null
  // constant-time compare of the full token
  const want = unsubscribeToken(hs256, secret, email, campaignId)
  if (want.length !== token.length) return null
  let diff = 0
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ token.charCodeAt(i)
  return diff === 0 ? { email: email.toLowerCase(), campaignId } : null
}
