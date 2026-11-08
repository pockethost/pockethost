import { describe, expect, it } from 'vitest'
import { isCodePath, ManifestError, MAX_MANIFEST_FILES, validateManifest } from './codeSet'

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
    'node_modules/marked/lib/marked.cjs',
    'node_modules/marked/package.json',
    'node_modules/a/node_modules/b/index.js',
    'node_modules/@scope/pkg/dist/index.mjs',
    'node_modules/.bin/x',
  ])('accepts %s', (p) => expect(isCodePath(p)).toBe(true))

  it.each([
    'pb_data/data.db',
    'pb_data',
    'node_modules',
    'pb_hooks/node_modules/x.js',
    'pb_public/node_modules/x.js',
    'patches/node_modules/x.patch',
    'node_modules/x/.github/workflows/ci.yml',
    'node_modules/x/.gitignore',
    'node_modules/../pb_data/data.db',
    'node_modules//x.js',
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

  it('accepts root node_modules and rejects nested node_modules with a clear message', () => {
    expect(validateManifest({ 'node_modules/marked/lib/marked.cjs': h })).toEqual({
      'node_modules/marked/lib/marked.cjs': h,
    })
    expect(() => validateManifest({ 'pb_hooks/node_modules/x.js': h })).toThrow(
      /pb_hooks\/node_modules\/x.js is outside the deployable set.*no node_modules inside other folders/
    )
  })

  it('explains the file limit, mentioning node_modules when it is involved', () => {
    const many = (prefix: string) =>
      Object.fromEntries(Array.from({ length: MAX_MANIFEST_FILES + 1 }, (_, i) => [`${prefix}/f${i}.js`, h]))
    expect(() => validateManifest(many('pb_hooks'))).toThrow(
      /Too many files \(20001\); a deploy can have at most 20000\.$/
    )
    expect(() => validateManifest(many('node_modules/x'))).toThrow(
      /Too many files \(20001, 20001 of them in node_modules\).*only production dependencies/
    )
  })

  it('rejects a path that is both a file and a directory', () => {
    expect(() => validateManifest({ 'pb_public/a': h, 'pb_public/a/b.html': h })).toThrow(/both a file and a directory/)
  })
})
