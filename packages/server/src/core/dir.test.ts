import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it } from 'vitest'
import { dirHasAnyFile } from './dir'

describe(`dirHasAnyFile`, () => {
  const root = mkdtempSync(join(tmpdir(), `ph-dir-`))
  afterAll(() => rmSync(root, { recursive: true, force: true }))

  it(`treats a tree of empty folders as empty`, () => {
    const skeleton = join(root, `skeleton`)
    for (const d of [`pb_data`, `pb_hooks`, `logs`]) mkdirSync(join(skeleton, d), { recursive: true })
    expect(dirHasAnyFile(skeleton)).toBe(false)
    expect(dirHasAnyFile(join(root, `missing`))).toBe(false)
  })
  it(`finds nested files`, () => {
    const full = join(root, `full`)
    mkdirSync(join(full, `pb_data`, `storage`, `x`), { recursive: true })
    writeFileSync(join(full, `pb_data`, `storage`, `x`, `f.bin`), `1`)
    expect(dirHasAnyFile(full)).toBe(true)
  })
})
