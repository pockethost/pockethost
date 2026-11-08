import { mkArchiveDownloadUrl, mkBackupDownloadUrl } from '@'
import { describe, expect, it, vi } from 'vitest'
import { createArchiveDownloadMiddleware } from './archiveDownload'

const NOW = Date.parse(`2026-11-06T00:00:00Z`)
const HOST = `mothership.example.io`
const ID = `ayzy6urnmynwgzr`
const SECRET = `s3cret`

const noopLogger: any = { create: () => ({ info: () => {}, error: () => {}, dbg: () => {} }) }

const run = async (opts: {
  host?: string
  url: string
  presign?: (id: string) => Promise<string>
  presignBackup?: (id: string, zip: string) => Promise<string>
}) => {
  const presign = opts.presign ?? vi.fn(async () => `https://bucket.example/signed`)
  const presignBackup = opts.presignBackup ?? vi.fn(async () => `https://bucket.example/backup`)
  const mw = createArchiveDownloadMiddleware({
    host: HOST,
    secret: () => SECRET,
    presign,
    presignBackup,
    now: () => NOW,
    logger: noopLogger,
  })
  const url = new URL(opts.url, `https://${opts.host ?? HOST}`)
  const req: any = {
    method: `GET`,
    hostname: opts.host ?? HOST,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
  }
  const out: { status?: number; redirect?: string; body?: string; next?: boolean } = {}
  await new Promise<void>((done) => {
    const res: any = {
      status: (s: number) => ((out.status = s), res),
      type: () => res,
      send: (b: string) => ((out.body = b), done(), res),
      redirect: (s: number, u: string) => ((out.status = s), (out.redirect = u), done(), res),
    }
    mw(req, res, () => ((out.next = true), done()))
  })
  return { ...out, presign, presignBackup }
}

const signed = (exp = Math.floor(NOW / 1000) + 3600) => mkArchiveDownloadUrl(`https://${HOST}`, ID, exp, SECRET)

describe(`archive download route`, () => {
  it(`redirects a valid link to a presigned URL`, async () => {
    const r = await run({ url: signed() })
    expect(r).toMatchObject({ status: 302, redirect: `https://bucket.example/signed` })
    expect(r.presign).toHaveBeenCalledWith(ID)
  })
  it(`passes through other hosts and paths`, async () => {
    expect((await run({ host: `someapp.example.io`, url: signed() })).next).toBe(true)
    expect((await run({ url: `/api/health` })).next).toBe(true)
  })
  it(`rejects bad and expired links without presigning`, async () => {
    const bad = await run({ url: signed().replace(/sig=[^&]+/, `sig=nope`) })
    expect(bad.status).toBe(403)
    expect(bad.presign).not.toHaveBeenCalled()
    expect((await run({ url: signed(Math.floor(NOW / 1000) - 1) })).status).toBe(410)
  })
  it(`reports a missing archive as 404`, async () => {
    const r = await run({ url: signed(), presign: async () => Promise.reject(new Error(`object not found`)) })
    expect(r.status).toBe(404)
  })
})

describe(`backup download route`, () => {
  const ZIP = `@auto_pb_backup_app_20261108.zip`
  const backupLink = (exp = Math.floor(NOW / 1000) + 3600) =>
    mkBackupDownloadUrl(`https://${HOST}`, ID, ZIP, exp, SECRET)

  it(`redirects a valid link to a presigned URL for that zip`, async () => {
    const r = await run({ url: backupLink() })
    expect(r).toMatchObject({ status: 302, redirect: `https://bucket.example/backup` })
    expect(r.presignBackup).toHaveBeenCalledWith(ID, ZIP)
    expect(r.presign).not.toHaveBeenCalled()
  })
  it(`rejects a link signed for another zip`, async () => {
    const r = await run({ url: backupLink().replace(encodeURIComponent(ZIP), `other.zip`) })
    expect(r.status).toBe(403)
    expect(r.presignBackup).not.toHaveBeenCalled()
  })
  it(`rejects expired links`, async () => {
    expect((await run({ url: backupLink(Math.floor(NOW / 1000) - 1) })).status).toBe(410)
  })
  it(`reports a deleted zip as 404`, async () => {
    const r = await run({ url: backupLink(), presignBackup: async () => Promise.reject(new Error(`object not found`)) })
    expect(r.status).toBe(404)
  })
})
