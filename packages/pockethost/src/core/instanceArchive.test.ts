import { describe, expect, it } from 'vitest'
import {
  MS_PER_DAY,
  isArchiveExpired,
  isArchivedSuspension,
  isStaleCandidate,
  mkArchiveDownloadUrl,
  mkArchiveExpiredSuspension,
  mkArchivedSuspension,
  parseArchiveObjectName,
  popSuspension,
  pushSuspension,
  verifyArchiveLink,
} from './instanceArchive'

const NOW = Date.parse(`2026-11-06T00:00:00Z`)
const daysAgo = (d: number) => new Date(NOW - d * MS_PER_DAY).toISOString()

const base = {
  updated: daysAgo(400),
  suspension: ``,
  owner: { subscription: `free`, subscription_status: ``, suspension: `` },
}

describe(`isStaleCandidate`, () => {
  it(`accepts a free, unsuspended instance idle past the threshold`, () => {
    expect(isStaleCandidate(base, NOW, 365)).toBe(true)
  })
  it(`rejects recently used instances`, () => {
    expect(isStaleCandidate({ ...base, updated: daysAgo(364) }, NOW, 365)).toBe(false)
  })
  it(`rejects paid plans and active subscriptions`, () => {
    expect(isStaleCandidate({ ...base, owner: { ...base.owner, subscription: `premium` } }, NOW, 365)).toBe(false)
    expect(isStaleCandidate({ ...base, owner: { ...base.owner, subscription_status: `active` } }, NOW, 365)).toBe(false)
  })
  it(`includes suspended instances and owners`, () => {
    expect(isStaleCandidate({ ...base, suspension: `Fair use` }, NOW, 365)).toBe(true)
    expect(isStaleCandidate({ ...base, owner: { ...base.owner, suspension: `x` } }, NOW, 365)).toBe(true)
  })
  it(`skips instances that are already archived, even under older history`, () => {
    const archived = pushSuspension(mkArchivedSuspension(new Date(NOW)), `Fair use`)
    expect(isStaleCandidate({ ...base, suspension: archived }, NOW, 365)).toBe(false)
  })
  it(`skips lapsed owners unless asked`, () => {
    const lapsed = { ...base, owner: { ...base.owner, subscription_status: `lapsed` } }
    expect(isStaleCandidate(lapsed, NOW, 365)).toBe(false)
    expect(isStaleCandidate(lapsed, NOW, 365, { includeLapsed: true })).toBe(true)
  })
  it(`rejects unparseable dates`, () => {
    expect(isStaleCandidate({ ...base, updated: `` }, NOW, 365)).toBe(false)
  })
})

describe(`suspension text`, () => {
  it(`marks both archived states with the prefix`, () => {
    expect(isArchivedSuspension(mkArchivedSuspension(new Date(NOW)))).toBe(true)
    expect(isArchivedSuspension(mkArchiveExpiredSuspension())).toBe(true)
    expect(isArchivedSuspension(`Fair use violation`)).toBe(false)
    expect(isArchivedSuspension(``)).toBe(false)
  })
  it(`only mentions email when one was sent`, () => {
    const d = new Date(`2027-05-05T12:00:00Z`)
    expect(mkArchivedSuspension(d)).not.toMatch(/email/i)
    expect(mkArchivedSuspension(d)).toContain(`Contact support before 2027-05-05`)
    expect(mkArchivedSuspension(d, { emailed: true })).toMatch(/email/i)
  })
  it(`includes the deletion date`, () => {
    expect(mkArchivedSuspension(new Date(`2027-05-05T12:00:00Z`))).toContain(`2027-05-05`)
  })
})

describe(`suspension history`, () => {
  it(`pushes onto an empty suspension without a separator`, () => {
    expect(pushSuspension(`Archived: a`, ``)).toBe(`Archived: a`)
    expect(popSuspension(`Archived: a`)).toBe(``)
  })
  it(`stacks reasons newest first and pops back one level`, () => {
    const once = pushSuspension(`Archived: a`, `Fair use`)
    expect(once.startsWith(`Archived: a`)).toBe(true)
    expect(popSuspension(once)).toBe(`Fair use`)
    const twice = pushSuspension(`Archived: expired`, once)
    expect(isArchivedSuspension(twice)).toBe(true)
    expect(popSuspension(twice)).toBe(once)
    expect(popSuspension(popSuspension(twice))).toBe(`Fair use`)
  })
})

describe(`archive object names`, () => {
  it(`parses instance ids`, () => {
    expect(parseArchiveObjectName(`ayzy6urnmynwgzr.tar.zst`)).toBe(`ayzy6urnmynwgzr`)
    expect(parseArchiveObjectName(`ayzy6urnmynwgzr.tar.zst.partial`)).toBe(null)
    expect(parseArchiveObjectName(`../x.tar.zst`)).toBe(null)
  })
})

describe(`isArchiveExpired`, () => {
  it(`expires at the retention boundary`, () => {
    expect(isArchiveExpired(NOW - 179 * MS_PER_DAY, NOW, 180)).toBe(false)
    expect(isArchiveExpired(NOW - 180 * MS_PER_DAY, NOW, 180)).toBe(true)
  })
})

describe(`signed download links`, () => {
  const secret = `s3cret`
  const id = `ayzy6urnmynwgzr`
  const exp = Math.floor(NOW / 1000) + 3600
  const parse = (u: string) => {
    const url = new URL(u)
    return { exp: url.searchParams.get(`exp`), sig: url.searchParams.get(`sig`), path: url.pathname }
  }

  it(`round-trips`, () => {
    const { exp: e, sig, path } = parse(mkArchiveDownloadUrl(`https://x.example`, id, exp, secret))
    expect(path).toBe(`/_ph/archive/${id}`)
    expect(verifyArchiveLink(id, e, sig, secret, NOW)).toEqual({ ok: true })
  })
  it(`rejects tampering`, () => {
    const { exp: e, sig } = parse(mkArchiveDownloadUrl(`https://x.example`, id, exp, secret))
    expect(verifyArchiveLink(`zzzzzzzzzzzzzzz`, e, sig, secret, NOW)).toMatchObject({ ok: false, status: 403 })
    expect(verifyArchiveLink(id, String(exp + 1), sig, secret, NOW)).toMatchObject({ ok: false, status: 403 })
    expect(verifyArchiveLink(id, e, sig, `other`, NOW)).toMatchObject({ ok: false, status: 403 })
  })
  it(`rejects expired and malformed links`, () => {
    const { exp: e, sig } = parse(mkArchiveDownloadUrl(`https://x.example`, id, exp, secret))
    expect(verifyArchiveLink(id, e, sig, secret, NOW + 2 * 3600 * 1000)).toMatchObject({ ok: false, status: 410 })
    expect(verifyArchiveLink(id, undefined, sig, secret, NOW)).toMatchObject({ ok: false, status: 400 })
    expect(verifyArchiveLink(`../etc`, e, sig, secret, NOW)).toMatchObject({ ok: false, status: 400 })
  })
  it(`refuses to sign or verify without a secret`, () => {
    expect(() => mkArchiveDownloadUrl(`https://x.example`, id, exp, ``)).toThrow()
    expect(verifyArchiveLink(id, String(exp), `x`, ``, NOW)).toMatchObject({ ok: false, status: 403 })
  })
})
