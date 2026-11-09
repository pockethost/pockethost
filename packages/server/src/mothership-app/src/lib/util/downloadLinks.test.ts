import { createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'
// Links exactly as the edge jobs sign them today.
import { mkBackupDownloadUrl } from '../../../../core/backupIcebox'
import { mkArchiveDownloadUrl } from '../../../../core/instanceArchive'
import { hexToBase64Url, verifyArchiveLink, verifyBackupLink } from './downloadLinks'

const SECRET = 's3cret'
const ID = 'ayzy6urnmynwgzr'
const ZIP = '@auto_pb_backup_ph_20261101.zip'
const NOW = Date.parse('2026-11-09T00:00:00Z')
const EXP = Math.floor(NOW / 1000) + 3600
const hmacHex = (text: string, secret: string) => createHmac('sha256', secret).update(text).digest('hex')

const tamper = (sig: string) => sig.slice(0, -1) + (sig.endsWith('A') ? 'B' : 'A')

const parse = (url: string) => {
  const u = new URL(url)
  return { path: u.pathname, exp: u.searchParams.get('exp')!, sig: u.searchParams.get('sig')! }
}

describe('hexToBase64Url', () => {
  it('matches node base64url for every length remainder', () => {
    for (const text of ['', 'a', 'ab', 'abc', 'abcd', 'hello world']) {
      const hex = createHmac('sha256', 'k').update(text).digest('hex')
      expect(hexToBase64Url(hex)).toBe(createHmac('sha256', 'k').update(text).digest('base64url'))
      const raw = Buffer.from(text).toString('hex')
      expect(hexToBase64Url(raw)).toBe(Buffer.from(text).toString('base64url'))
    }
  })
})

describe('verifyArchiveLink', () => {
  const link = parse(mkArchiveDownloadUrl('https://pockethost-central.pockethost.io', ID, EXP, SECRET))

  it('accepts a link signed by the edge', () => {
    expect(link.path).toBe(`/_ph/archive/${ID}`)
    expect(verifyArchiveLink(ID, link.exp, link.sig, SECRET, NOW, hmacHex)).toEqual({ ok: true })
  })
  it('rejects a tampered signature, another instance, or another secret', () => {
    expect(verifyArchiveLink(ID, link.exp, tamper(link.sig), SECRET, NOW, hmacHex)).toMatchObject({ status: 403 })
    expect(verifyArchiveLink('bbbbbbbbbbbbbbb', link.exp, link.sig, SECRET, NOW, hmacHex)).toMatchObject({
      status: 403,
    })
    expect(verifyArchiveLink(ID, link.exp, link.sig, 'other', NOW, hmacHex)).toMatchObject({ status: 403 })
    expect(verifyArchiveLink(ID, String(EXP + 1), link.sig, SECRET, NOW, hmacHex)).toMatchObject({ status: 403 })
  })
  it('rejects expired links with 410', () => {
    expect(verifyArchiveLink(ID, link.exp, link.sig, SECRET, (EXP + 1) * 1000, hmacHex)).toMatchObject({ status: 410 })
  })
  it('rejects malformed input and a missing secret', () => {
    expect(verifyArchiveLink('BAD', link.exp, link.sig, SECRET, NOW, hmacHex)).toMatchObject({ status: 400 })
    expect(verifyArchiveLink(ID, 'abc', link.sig, SECRET, NOW, hmacHex)).toMatchObject({ status: 400 })
    expect(verifyArchiveLink(ID, undefined, link.sig, SECRET, NOW, hmacHex)).toMatchObject({ status: 400 })
    expect(verifyArchiveLink(ID, link.exp, link.sig, '', NOW, hmacHex)).toMatchObject({ status: 403 })
  })
})

describe('verifyBackupLink', () => {
  const link = parse(mkBackupDownloadUrl('https://pockethost-central.pockethost.io', ID, ZIP, EXP, SECRET))
  const zip = decodeURIComponent(link.path.split('/').pop()!)

  it('accepts a link signed by the edge', () => {
    expect(zip).toBe(ZIP)
    expect(verifyBackupLink(ID, zip, link.exp, link.sig, SECRET, NOW, hmacHex)).toEqual({ ok: true })
  })
  it('rejects a different zip, tampering, expiry and bad names', () => {
    expect(verifyBackupLink(ID, 'other.zip', link.exp, link.sig, SECRET, NOW, hmacHex)).toMatchObject({ status: 403 })
    expect(verifyBackupLink(ID, zip, link.exp, link.sig + 'x', SECRET, NOW, hmacHex)).toMatchObject({ status: 403 })
    expect(verifyBackupLink(ID, zip, link.exp, link.sig, SECRET, (EXP + 1) * 1000, hmacHex)).toMatchObject({
      status: 410,
    })
    expect(verifyBackupLink(ID, '../x.zip', link.exp, link.sig, SECRET, NOW, hmacHex)).toMatchObject({ status: 400 })
    expect(verifyBackupLink(ID, 'notes.txt', link.exp, link.sig, SECRET, NOW, hmacHex)).toMatchObject({ status: 400 })
  })
})
