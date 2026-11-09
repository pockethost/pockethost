/**
 * Presigned S3 GET URLs (AWS Signature V4, query-string auth), runnable in PocketBase's goja VM: no node APIs.
 *
 * PocketBase's `$security` covers the text hashing (`sha256`), but SigV4's signing-key chain HMACs with the previous
 * step's raw 32-byte digest as the key, and `$security.hs256` only accepts string keys (goja passes them to Go as
 * UTF-8, which mangles bytes above 0x7f). So the four chained HMACs use the small byte-level SHA-256 below.
 */

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
  0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
  0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
  0xc67178f2,
]

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n))

/** UTF-8 bytes of a JS string (no TextEncoder in goja). */
export const utf8 = (s: string): number[] => {
  const out: number[] = []
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i)
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const d = s.charCodeAt(i + 1)
      if (d >= 0xdc00 && d <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00)
        i++
      }
    }
    if (c < 0x80) out.push(c)
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63))
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
  }
  return out
}

export const toHex = (bytes: number[]) => {
  let s = ''
  for (const b of bytes) s += (b < 16 ? '0' : '') + b.toString(16)
  return s
}

/** SHA-256 of a byte array, as bytes. */
export const sha256Bytes = (msg: number[]): number[] => {
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]
  const bitLen = msg.length * 8
  const data = msg.slice()
  data.push(0x80)
  while (data.length % 64 !== 56) data.push(0)
  const hi = Math.floor(bitLen / 0x100000000)
  data.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255)
  data.push((bitLen >>> 24) & 255, (bitLen >>> 16) & 255, (bitLen >>> 8) & 255, bitLen & 255)
  const w = new Array<number>(64)
  for (let off = 0; off < data.length; off += 64) {
    for (let i = 0; i < 16; i++) {
      const j = off + i * 4
      w[i] = ((data[j]! << 24) | (data[j + 1]! << 16) | (data[j + 2]! << 8) | data[j + 3]!) >>> 0
    }
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15]!
      const b = w[i - 2]!
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10)
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, hh] = h as [number, number, number, number, number, number, number, number]
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (hh + S1 + ch + K[i]! + w[i]!) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) >>> 0
      hh = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }
    h[0] = (h[0]! + a) >>> 0
    h[1] = (h[1]! + b) >>> 0
    h[2] = (h[2]! + c) >>> 0
    h[3] = (h[3]! + d) >>> 0
    h[4] = (h[4]! + e) >>> 0
    h[5] = (h[5]! + f) >>> 0
    h[6] = (h[6]! + g) >>> 0
    h[7] = (h[7]! + hh) >>> 0
  }
  const out: number[] = []
  for (const x of h) out.push((x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255)
  return out
}

/** HMAC-SHA256 with a byte key, as bytes. */
export const hmacBytes = (key: number[], msg: number[]): number[] => {
  let k = key.length > 64 ? sha256Bytes(key) : key.slice()
  while (k.length < 64) k.push(0)
  const inner = k.map((b) => b ^ 0x36).concat(msg)
  const outer = k.map((b) => b ^ 0x5c)
  return sha256Bytes(outer.concat(sha256Bytes(inner)))
}

/** RFC 3986 encoding as SigV4 wants it (encodeURIComponent leaves !'()* alone). */
export const uriEncode = (s: string, keepSlash = false) => {
  const enc = encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
  return keepSlash ? enc.replace(/%2F/g, '/') : enc
}

export type PresignInput = {
  /** HTTP method the URL is for (default GET). */
  method?: 'GET' | 'HEAD'
  /** E.g. `https://n2d2.or4.idrivee2-64.com` (path-style) or `https://bucket.s3.amazonaws.com` (virtual-hosted). */
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  /** Bucket for path-style URLs; leave empty when the bucket is already in the endpoint host. */
  bucket: string
  key: string
  expiresSec: number
  /** Signing time in ms (Date.now()). */
  nowMs: number
  /** Sha256(text) as lowercase hex. `$security.sha256` in PocketBase. */
  sha256Hex: (text: string) => string
}

const amzDate = (ms: number) => {
  const iso = new Date(ms).toISOString() // 2026-11-09T17:30:00.000Z
  return iso.slice(0, 4) + iso.slice(5, 7) + iso.slice(8, 13) + iso.slice(14, 16) + iso.slice(17, 19) + 'Z'
}

/** Presigned URL (GET by default), valid for `expiresSec` from `nowMs`. */
export const presignUrl = (p: PresignInput) => {
  const endpoint = p.endpoint.replace(/\/+$/, '')
  const host = endpoint.replace(/^https?:\/\//, '')
  const path = '/' + (p.bucket ? `${p.bucket}/` : '') + p.key.replace(/^\/+/, '')
  const canonicalUri = uriEncode(path, true)
  const datetime = amzDate(p.nowMs)
  const date = datetime.slice(0, 8)
  const scope = `${date}/${p.region}/s3/aws4_request`
  const params: [string, string][] = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${p.accessKeyId}/${scope}`],
    ['X-Amz-Date', datetime],
    ['X-Amz-Expires', String(p.expiresSec)],
    ['X-Amz-SignedHeaders', 'host'],
  ]
  const query = params
    .map(([k, v]) => [uriEncode(k), uriEncode(v)] as [string, string])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  const canonicalRequest = [
    p.method ?? 'GET',
    canonicalUri,
    query,
    `host:${host}`,
    '',
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')
  const stringToSign = ['AWS4-HMAC-SHA256', datetime, scope, p.sha256Hex(canonicalRequest)].join('\n')
  let signingKey = hmacBytes(utf8(`AWS4${p.secretAccessKey}`), utf8(date))
  for (const part of [p.region, 's3', 'aws4_request']) signingKey = hmacBytes(signingKey, utf8(part))
  const signature = toHex(hmacBytes(signingKey, utf8(stringToSign)))
  return `${endpoint}${canonicalUri}?${query}&X-Amz-Signature=${signature}`
}

/** Presigned GET URL. */
export const presignGetUrl = (p: PresignInput) => presignUrl({ ...p, method: 'GET' })

/** `remote:bucket/prefix` (rclone-style, as in PH_ARCHIVE_REMOTE) to bucket + key prefix. */
export const parseRemote = (remote: string) => {
  const path = remote.includes(':') ? remote.slice(remote.indexOf(':') + 1) : remote
  const [bucket, ...rest] = path.replace(/^\/+|\/+$/g, '').split('/')
  return { bucket: bucket ?? '', prefix: rest.join('/') }
}
