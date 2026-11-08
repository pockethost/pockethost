import { createHash } from 'crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDeployStore, DeployConflictError, MissingBlobsError, planDeploy } from './deployStore'

const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex')

let root: string
let instanceDir: string
let storeDir: string

const put = (rel: string, content: string) => {
  const p = join(instanceDir, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, content)
}
const read = (rel: string) => readFileSync(join(instanceDir, rel), 'utf8')

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'ph-deploy-'))
  instanceDir = join(root, 'instances', 'i1')
  storeDir = join(root, 'deploys', 'i1')
  mkdirSync(instanceDir, { recursive: true })
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('planDeploy', () => {
  it('splits writes, deletes and unchanged', () => {
    const plan = planDeploy(
      { a: '1', b: '2', c: '3' },
      new Map([
        ['a', { hash: '1' }],
        ['b', { hash: 'x' }],
        ['d', { hash: '4' }],
      ])
    )
    expect(plan).toEqual({ toWrite: ['b', 'c'], toDelete: ['d'], unchanged: 1 })
  })
})

describe('createDeployStore', () => {
  it('scans only the code set', async () => {
    put('pb_hooks/main.pb.js', 'hook')
    put('pb_data/data.db', 'db')
    put('pb_hooks/node_modules/x/index.js', 'nm')
    put('node_modules/y.js', 'nm')
    put('package.json', '{}')
    put('notes.txt', 'n')
    const store = createDeployStore(storeDir, instanceDir)
    const current = await store.scanCurrent()
    expect([...current.keys()].sort()).toEqual(['package.json', 'pb_hooks/main.pb.js'])
    expect(current.get('package.json')!.hash).toBe(sha('{}'))
  })

  it('reports only hashes that are neither on disk nor uploaded', async () => {
    put('pb_hooks/a.pb.js', 'A')
    const store = createDeployStore(storeDir, instanceDir)
    const missing = await store.findMissing({
      'pb_hooks/a.pb.js': sha('A'),
      'pb_hooks/moved.pb.js': sha('A'),
      'pb_hooks/b.pb.js': sha('B'),
    })
    expect(missing).toEqual([sha('B')])
    await store.putBlob(sha('B'), Buffer.from('B'))
    expect(await store.findMissing({ 'pb_hooks/b.pb.js': sha('B') })).toEqual([])
  })

  it('applies a deploy: writes, deletes stale code, preserves data and excluded files', async () => {
    put('pb_hooks/old.pb.js', 'old')
    put('pb_hooks/keep.pb.js', 'keep')
    put('pb_public/sub/dir/page.html', 'gone')
    put('pb_data/data.db', 'db')
    put('pb_hooks/node_modules/dep.js', 'dep')
    put('notes.txt', 'user file')
    const store = createDeployStore(storeDir, instanceDir)
    await store.putBlob(sha('new'), Buffer.from('new'))
    await store.putBlob(sha('<h1>'), Buffer.from('<h1>'))

    const manifest = {
      'pb_hooks/keep.pb.js': sha('keep'),
      'pb_hooks/new.pb.js': sha('new'),
      'pb_hooks/copy-of-keep.pb.js': sha('keep'),
      'pb_public/index.html': sha('<h1>'),
    }
    const staged = await store.stage(manifest)
    const r = await store.apply(manifest, staged)

    expect(r.written.sort()).toEqual(['pb_hooks/copy-of-keep.pb.js', 'pb_hooks/new.pb.js', 'pb_public/index.html'])
    expect(r.deleted.sort()).toEqual(['pb_hooks/old.pb.js', 'pb_public/sub/dir/page.html'])
    expect(r.unchanged).toBe(1)
    expect(r.packagesChanged).toBe(false)
    expect(read('pb_hooks/new.pb.js')).toBe('new')
    expect(read('pb_hooks/copy-of-keep.pb.js')).toBe('keep')
    expect(existsSync(join(instanceDir, 'pb_hooks/old.pb.js'))).toBe(false)
    expect(existsSync(join(instanceDir, 'pb_public/sub'))).toBe(false)
    expect(existsSync(join(instanceDir, 'pb_public'))).toBe(true)
    expect(read('pb_data/data.db')).toBe('db')
    expect(read('pb_hooks/node_modules/dep.js')).toBe('dep')
    expect(read('notes.txt')).toBe('user file')
    // staging/backup cleaned up
    expect(readdirSync(join(storeDir, 'tmp'))).toEqual([])
  })

  it('replaces a file with a directory and vice versa', async () => {
    put('pb_public/a', 'file')
    put('pb_public/b/c.html', 'dir')
    const store = createDeployStore(storeDir, instanceDir)
    await store.putBlob(sha('x'), Buffer.from('x'))
    const manifest = { 'pb_public/a/index.html': sha('x'), 'pb_public/b': sha('x') }
    await store.apply(manifest, await store.stage(manifest))
    expect(read('pb_public/a/index.html')).toBe('x')
    expect(read('pb_public/b')).toBe('x')
  })

  it('flags package changes', async () => {
    const store = createDeployStore(storeDir, instanceDir)
    await store.putBlob(sha('{}'), Buffer.from('{}'))
    const manifest = { 'package.json': sha('{}') }
    const r = await store.apply(manifest, await store.stage(manifest))
    expect(r.packagesChanged).toBe(true)
  })

  it('throws MissingBlobsError and leaves the instance untouched', async () => {
    put('pb_hooks/a.pb.js', 'A')
    const store = createDeployStore(storeDir, instanceDir)
    await expect(store.stage({ 'pb_hooks/b.pb.js': sha('B') })).rejects.toBeInstanceOf(MissingBlobsError)
    expect(read('pb_hooks/a.pb.js')).toBe('A')
  })

  it('rolls back when apply fails part-way', async () => {
    put('pb_hooks/a.pb.js', 'A')
    put('pb_hooks/stale.pb.js', 'S')
    put('pb_public/blocker/node_modules/x.js', 'kept')
    const store = createDeployStore(storeDir, instanceDir)
    await store.putBlob(sha('A2'), Buffer.from('A2'))
    await store.putBlob(sha('X'), Buffer.from('X'))
    // pb_public/blocker is a directory holding preserved files, so writing a file there must fail.
    const manifest = { 'pb_hooks/a.pb.js': sha('A2'), 'pb_public/blocker': sha('X') }
    const staged = await store.stage(manifest)
    await expect(store.apply(manifest, staged)).rejects.toBeInstanceOf(DeployConflictError)
    expect(read('pb_hooks/a.pb.js')).toBe('A')
    expect(read('pb_hooks/stale.pb.js')).toBe('S')
    expect(read('pb_public/blocker/node_modules/x.js')).toBe('kept')
  })

  it('refuses symlinks in the code set', async () => {
    put('outside.txt', 'secret')
    mkdirSync(join(instanceDir, 'pb_hooks'), { recursive: true })
    symlinkSync(join(instanceDir, 'outside.txt'), join(instanceDir, 'pb_hooks/link.js'))
    const store = createDeployStore(storeDir, instanceDir)
    await expect(store.scanCurrent()).rejects.toBeInstanceOf(DeployConflictError)
  })

  it('records manifests and garbage-collects unreferenced blobs', async () => {
    const store = createDeployStore(storeDir, instanceDir)
    for (const v of ['v1', 'v2', 'v3']) {
      await store.putBlob(sha(v), Buffer.from(v))
      const manifest = { 'pb_hooks/main.pb.js': sha(v) }
      await store.apply(manifest, await store.stage(manifest))
      await store.recordManifest(`d-${v}`, manifest)
      await new Promise((r) => setTimeout(r, 5))
    }
    await store.putBlob(sha('orphan'), Buffer.from('orphan'))
    const { removedBlobs } = await store.gc(2)
    expect(removedBlobs).toBe(2) // v1 + orphan
    expect(store.hasBlob(sha('v1'))).toBe(false)
    expect(store.hasBlob(sha('v2'))).toBe(true)
    expect(store.hasBlob(sha('v3'))).toBe(true)
    expect(readdirSync(join(storeDir, 'manifests')).sort()).toEqual(['d-v2.json', 'd-v3.json'])
  })
})
