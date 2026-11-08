import { describe, expect, it } from 'vitest'
import {
  backupIceboxObjectPath,
  backupLinkExpSec,
  ICEBOX_STUB_MARKER,
  isBackupZipName,
  isIceboxStub,
  mkBackupDownloadUrl,
  mkIceboxStub,
  planBackupIcebox,
  verifyBackupLink,
} from './backupIcebox'

const NOW = Date.parse(`2026-11-08T12:00:00Z`)
const HOUR = 3_600_000
const ID = `ayzy6urnmynwgzr`
const SECRET = `s3cret`

const f = (name: string, hoursAgo: number, size = 100) => ({ name, mtimeMs: NOW - hoursAgo * HOUR, size })

describe(`isBackupZipName`, () => {
  it(`accepts PocketBase backup names`, () => {
    expect(isBackupZipName(`pb_backup_20261108120000.zip`)).toBe(true)
    expect(isBackupZipName(`@auto_pb_backup_my_app_20261108120000.zip`)).toBe(true)
  })
  it(`rejects stubs, sidecars, temp files and paths`, () => {
    expect(isBackupZipName(`pb_backup.zip.txt`)).toBe(false)
    expect(isBackupZipName(`pb_backup.zip.attrs`)).toBe(false)
    expect(isBackupZipName(`pb_backup.zip.tmp`)).toBe(false)
    expect(isBackupZipName(`../x.zip`)).toBe(false)
    expect(isBackupZipName(`a/b.zip`)).toBe(false)
  })
})

describe(`planBackupIcebox`, () => {
  it(`keeps the newest zip and iceboxes older ones, oldest first`, () => {
    const plan = planBackupIcebox([f(`b.zip`, 48), f(`c.zip`, 2), f(`a.zip`, 72)], NOW, HOUR)
    expect(plan.keep?.name).toBe(`c.zip`)
    expect(plan.icebox.map((x) => x.name)).toEqual([`a.zip`, `b.zip`])
    expect(plan.recent).toEqual([])
  })

  it(`leaves recent zips alone and keeps the newest finished one`, () => {
    const plan = planBackupIcebox([f(`old.zip`, 48), f(`done.zip`, 5), f(`writing.zip`, 0.1)], NOW, HOUR)
    expect(plan.keep?.name).toBe(`done.zip`)
    expect(plan.icebox.map((x) => x.name)).toEqual([`old.zip`])
    expect(plan.recent.map((x) => x.name)).toEqual([`writing.zip`])
  })

  it(`does nothing with a single zip or no zips`, () => {
    expect(planBackupIcebox([f(`only.zip`, 100)], NOW, HOUR).icebox).toEqual([])
    expect(planBackupIcebox([], NOW, HOUR)).toEqual({ keep: null, icebox: [], recent: [] })
  })

  it(`ignores stubs, sidecars and other files`, () => {
    const plan = planBackupIcebox(
      [f(`a.zip`, 72), f(`a.zip.attrs`, 72), f(`x.zip.txt`, 90), f(`notes.md`, 90), f(`b.zip`, 10)],
      NOW,
      HOUR
    )
    expect(plan.keep?.name).toBe(`b.zip`)
    expect(plan.icebox.map((x) => x.name)).toEqual([`a.zip`])
  })
})

describe(`stubs`, () => {
  const expSec = backupLinkExpSec(NOW, 180)
  const url = mkBackupDownloadUrl(`https://mothership.example.io`, ID, `pb_backup_1.zip`, expSec, SECRET)
  const stub = mkIceboxStub({ zipName: `pb_backup_1.zip`, url, iceboxedAtMs: NOW, expSec, retentionDays: 180 })

  it(`starts with the marker and carries the link and dates`, () => {
    expect(stub.split(`\n`)[0]).toBe(ICEBOX_STUB_MARKER)
    expect(stub).toContain(url)
    expect(stub).toContain(`2026-11-08`)
    expect(stub).toContain(`2027-05-07`)
    expect(stub).toContain(`180 days`)
  })

  it(`is recognized only with the marker and a .zip.txt name`, () => {
    expect(isIceboxStub(`pb_backup_1.zip.txt`, ICEBOX_STUB_MARKER)).toBe(true)
    expect(isIceboxStub(`pb_backup_1.zip.txt`, `my own notes`)).toBe(false)
    expect(isIceboxStub(`readme.txt`, ICEBOX_STUB_MARKER)).toBe(false)
  })
})

describe(`backup links`, () => {
  const expSec = backupLinkExpSec(NOW, 180)
  const zip = `@auto_pb_backup_app_1.zip`
  const parse = (u: string) => {
    const url = new URL(u)
    const [, , , id, name] = url.pathname.split(`/`)
    return {
      id: id!,
      name: decodeURIComponent(name!),
      exp: url.searchParams.get(`exp`),
      sig: url.searchParams.get(`sig`),
    }
  }

  it(`round-trips`, () => {
    const l = parse(mkBackupDownloadUrl(`https://m.example.io`, ID, zip, expSec, SECRET))
    expect(l.name).toBe(zip)
    expect(verifyBackupLink(l.id, l.name, l.exp, l.sig, SECRET, NOW)).toEqual({ ok: true })
  })

  it(`rejects a different zip name, a bad signature and an expired link`, () => {
    const l = parse(mkBackupDownloadUrl(`https://m.example.io`, ID, zip, expSec, SECRET))
    expect(verifyBackupLink(l.id, `other.zip`, l.exp, l.sig, SECRET, NOW)).toMatchObject({ status: 403 })
    expect(verifyBackupLink(l.id, l.name, l.exp, `nope`, SECRET, NOW)).toMatchObject({ status: 403 })
    expect(verifyBackupLink(l.id, l.name, l.exp, l.sig, SECRET, (expSec + 1) * 1000)).toMatchObject({ status: 410 })
  })

  it(`does not accept an instance archive signature`, () => {
    expect(verifyBackupLink(ID, zip, String(expSec), `x`.repeat(43), SECRET, NOW)).toMatchObject({ status: 403 })
  })

  it(`rejects bad names and ids`, () => {
    expect(verifyBackupLink(ID, `../x.zip`, `1`, `x`, SECRET, NOW)).toMatchObject({ status: 400 })
    expect(verifyBackupLink(`BAD`, zip, `1`, `x`, SECRET, NOW)).toMatchObject({ status: 400 })
  })
})

describe(`backupIceboxObjectPath`, () => {
  it(`joins remote, instance and zip`, () => {
    expect(backupIceboxObjectPath(`r:bucket/backup-icebox/`, ID, `a.zip`)).toBe(`r:bucket/backup-icebox/${ID}/a.zip`)
  })
})
