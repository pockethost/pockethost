import { describe, expect, it } from 'vitest'
import { mkBackupToken } from './backupToken'

describe(`mkBackupToken`, () => {
  it(`is stable per instance and secret`, () => {
    expect(mkBackupToken(`aaaaaaaaaaaaaaa`, `s`)).toBe(mkBackupToken(`aaaaaaaaaaaaaaa`, `s`))
  })
  it(`differs across instances and secrets`, () => {
    const t = mkBackupToken(`aaaaaaaaaaaaaaa`, `s`)
    expect(mkBackupToken(`bbbbbbbbbbbbbbb`, `s`)).not.toBe(t)
    expect(mkBackupToken(`aaaaaaaaaaaaaaa`, `t`)).not.toBe(t)
  })
  it(`is header-safe`, () => {
    expect(mkBackupToken(`aaaaaaaaaaaaaaa`, `s`)).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })
})
