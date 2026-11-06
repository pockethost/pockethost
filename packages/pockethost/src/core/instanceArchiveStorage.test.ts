import { execFileSync } from 'child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  deleteInstanceArchive,
  downloadInstanceArchive,
  listInstanceArchives,
  uploadInstanceArchive,
  verifyInstanceArchive,
} from './instanceArchiveStorage'

const hasTools = (() => {
  try {
    for (const bin of [`rclone`, `zstd`, `tar`]) execFileSync(`which`, [bin], { stdio: `ignore` })
    return true
  } catch {
    return false
  }
})()

describe.skipIf(!hasTools)(`instance archive storage (local rclone path)`, () => {
  const root = mkdtempSync(join(tmpdir(), `ph-archive-`))
  afterAll(() => rmSync(root, { recursive: true, force: true }))

  it(`uploads, verifies, lists, restores and deletes`, async () => {
    const id = `abcdefghijklmno`
    const src = join(root, `src`)
    const out = join(root, `out`)
    const remote = join(root, `remote`, `archive`)
    mkdirSync(join(src, id, `pb_data`), { recursive: true })
    mkdirSync(out)
    const payload = Buffer.alloc(200_000, 7)
    writeFileSync(join(src, id, `pb_data`, `data.db`), payload)

    expect(await listInstanceArchives(remote)).toEqual([])

    const digest = await uploadInstanceArchive(src, id, remote)
    expect(digest.bytes).toBeGreaterThan(0)
    await verifyInstanceArchive(remote, id, digest)
    await expect(verifyInstanceArchive(remote, id, { ...digest, sha256: `bad` })).rejects.toThrow(/mismatch/)

    expect((await listInstanceArchives(remote)).map((a) => a.name)).toEqual([`${id}.tar.zst`])

    await downloadInstanceArchive(remote, id, out)
    expect(readFileSync(join(out, id, `pb_data`, `data.db`))).toEqual(payload)

    await deleteInstanceArchive(remote, id)
    expect(await listInstanceArchives(remote)).toEqual([])
  })
})
