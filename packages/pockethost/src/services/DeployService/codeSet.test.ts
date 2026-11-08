import { describe, expect, it } from 'vitest'
import { isCodePath, isPackagePath, ManifestError, validateManifest } from './codeSet'

const h = 'a'.repeat(64)

describe('isCodePath', () => {
  it.each([
    'pb_hooks/main.pb.js',
    'pb_migrations/1_init.js',
    'pb_public/index.html',
    'pb_public/a/b/c.css',
    'package.json',
    'bun.lock',
    'bun.lockb',
    'patches/foo.patch',
    'pb_schema.json',
  ])('accepts %s', (p) => expect(isCodePath(p)).toBe(true))

  it.each([
    'pb_data/data.db',
    'pb_data',
    'node_modules/x/index.js',
    'pb_hooks/node_modules/x.js',
    'pb_hooks/.git/config',
    'pb_public/.gitignore',
    'README.md',
    'src/index.ts',
    'patches',
    '../etc/passwd',
    'pb_hooks/../pb_data/data.db',
    '/pb_hooks/x.js',
    'pb_hooks//x.js',
    'pb_hooks/./x.js',
    'pb_hooks\\x.js',
    '',
  ])('rejects %s', (p) => expect(isCodePath(p)).toBe(false))
})

describe('validateManifest', () => {
  it('accepts a normal manifest', () => {
    expect(validateManifest({ 'pb_hooks/a.pb.js': h, 'package.json': h })).toEqual({
      'pb_hooks/a.pb.js': h,
      'package.json': h,
    })
  })

  it('rejects pb_data and bad hashes', () => {
    expect(() => validateManifest({ 'pb_data/data.db': h })).toThrow(ManifestError)
    expect(() => validateManifest({ 'pb_hooks/a.js': 'nope' })).toThrow(/sha256/)
    expect(() => validateManifest({ 'pb_hooks/a.js': h.toUpperCase() })).toThrow(/sha256/)
    expect(() => validateManifest(null)).toThrow(ManifestError)
    expect(() => validateManifest([])).toThrow(ManifestError)
  })

  it('rejects a path that is both a file and a directory', () => {
    expect(() => validateManifest({ 'pb_public/a': h, 'pb_public/a/b.html': h })).toThrow(/both a file and a directory/)
  })
})

describe('isPackagePath', () => {
  it('flags package files', () => {
    expect(isPackagePath('package.json')).toBe(true)
    expect(isPackagePath('bun.lock')).toBe(true)
    expect(isPackagePath('patches/x.patch')).toBe(true)
    expect(isPackagePath('pb_hooks/package.json')).toBe(false)
  })
})
