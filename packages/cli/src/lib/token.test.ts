import { afterEach, describe, expect, it } from 'vitest'
import { INSTANCE_URL } from './constants'
import { isPat, maskToken } from './token'
import { isCodePath } from './codeSet'

const pat = `ph_pat_abcdefghij12345_${'A'.repeat(39)}wxyz`

afterEach(() => {
  delete process.env.POCKETHOST_MOTHERSHIP_URL
})

describe('token helpers', () => {
  it('recognises and masks PATs', () => {
    expect(isPat(pat)).toBe(true)
    expect(isPat(` ${pat}\n`)).toBe(true)
    expect(isPat('ph_pat_nope')).toBe(false)
    expect(maskToken(pat)).toBe('ph_pat_…wxyz')
  })
})

describe('INSTANCE_URL', () => {
  it('derives the instance host from the mothership URL', () => {
    expect(INSTANCE_URL('myapp')).toBe('https://myapp.pockethost.io')
    expect(INSTANCE_URL('app.example.com')).toBe('https://app.example.com')
    process.env.POCKETHOST_MOTHERSHIP_URL =
      'http://pockethost-central.pockethost.lvh.me:8080'
    expect(INSTANCE_URL('myapp')).toBe('http://myapp.pockethost.lvh.me:8080')
  })
})

describe('isCodePath', () => {
  it('matches the server code set', () => {
    expect(isCodePath('pb_hooks/main.pb.js')).toBe(true)
    expect(isCodePath('package.json')).toBe(true)
    expect(isCodePath('patches/a.patch')).toBe(true)
    expect(isCodePath('pb_data/data.db')).toBe(false)
    expect(isCodePath('src/index.ts')).toBe(false)
    expect(isCodePath('pb_hooks/node_modules/x.js')).toBe(false)
  })
})
