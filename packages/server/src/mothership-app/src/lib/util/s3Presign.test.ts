import { createHash, createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'
import { hmacBytes, parseRemote, presignGetUrl, presignUrl, sha256Bytes, toHex, uriEncode, utf8 } from './s3Presign'

const nodeSha256Hex = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex')

describe('sha256Bytes / hmacBytes match node:crypto', () => {
  const samples = ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'a'.repeat(200), 'héllo ✓ 𝄞']
  it('sha256', () => {
    for (const s of samples) expect(toHex(sha256Bytes(utf8(s)))).toBe(nodeSha256Hex(s))
  })
  it('utf8 matches Buffer', () => {
    for (const s of samples) expect(utf8(s)).toEqual([...Buffer.from(s, 'utf8')])
  })
  it('hmac with text and raw-byte keys (including bytes > 0x7f and keys > 64 bytes)', () => {
    const keys = [utf8('key'), [0, 255, 128, 200, 1, 2, 3], new Array(100).fill(0xab)]
    for (const key of keys) {
      for (const s of samples) {
        expect(toHex(hmacBytes(key, utf8(s)))).toBe(createHmac('sha256', Buffer.from(key)).update(s).digest('hex'))
      }
    }
  })
})

describe('uriEncode', () => {
  it('encodes RFC 3986 reserved characters and keeps slashes when asked', () => {
    expect(uriEncode("a b!'()*@~_.-")).toBe('a%20b%21%27%28%29%2A%40~_.-')
    expect(uriEncode('/bucket/a b/@x.zip', true)).toBe('/bucket/a%20b/%40x.zip')
  })
})

describe('presignGetUrl', () => {
  it('matches the AWS SigV4 documentation example (query-string auth, GET /test.txt)', () => {
    // https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
    const url = presignGetUrl({
      endpoint: 'https://examplebucket.s3.amazonaws.com',
      region: 'us-east-1',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      bucket: '',
      key: 'test.txt',
      expiresSec: 86400,
      nowMs: Date.parse('2013-05-24T00:00:00Z'),
      sha256Hex: nodeSha256Hex,
    })
    expect(url).toBe(
      'https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256' +
        '&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request' +
        '&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host' +
        '&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404'
    )
  })

  it('builds path-style URLs with an encoded key', () => {
    const url = presignGetUrl({
      endpoint: 'https://n2d2.example.com/',
      region: 'us-east-1',
      accessKeyId: 'AK',
      secretAccessKey: 'SK',
      bucket: 'sfo-2-data',
      key: 'backup-icebox/abc/@auto_pb_backup.zip',
      expiresSec: 3600,
      nowMs: Date.parse('2026-11-09T17:30:00Z'),
      sha256Hex: nodeSha256Hex,
    })
    expect(
      url.startsWith('https://n2d2.example.com/sfo-2-data/backup-icebox/abc/%40auto_pb_backup.zip?X-Amz-Algorithm=')
    ).toBe(true)
    expect(url).toContain('X-Amz-Date=20261109T173000Z')
    expect(url).toMatch(/&X-Amz-Signature=[0-9a-f]{64}$/)
  })
})

describe('presignUrl HEAD and parseRemote', () => {
  it('signs HEAD differently from GET', () => {
    const base = {
      endpoint: 'https://e.example',
      region: 'us-east-1',
      accessKeyId: 'AK',
      secretAccessKey: 'SK',
      bucket: 'b',
      key: 'k',
      expiresSec: 60,
      nowMs: 0,
      sha256Hex: nodeSha256Hex,
    }
    expect(presignUrl({ ...base, method: 'HEAD' })).not.toBe(presignGetUrl(base))
  })
  it('splits rclone-style remotes', () => {
    expect(parseRemote('sfo-2-data:sfo-2-data/archive')).toEqual({ bucket: 'sfo-2-data', prefix: 'archive' })
    expect(parseRemote('x:bucket/backup-icebox/')).toEqual({ bucket: 'bucket', prefix: 'backup-icebox' })
    expect(parseRemote('bucket')).toEqual({ bucket: 'bucket', prefix: '' })
  })
})
