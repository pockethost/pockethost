import { createHash } from 'crypto'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'fs'
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
const has = (rel: string) => existsSync(join(instanceDir, rel))

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

describe('root node_modules', () => {
  /** Uploads each content as a blob and returns a manifest for it. */
  const manifestOf = async (store: ReturnType<typeof createDeployStore>, files: Record<string, string>) => {
    for (const c of Object.values(files)) await store.putBlob(sha(c), Buffer.from(c))
    return Object.fromEntries(Object.entries(files).map(([p, c]) => [p, sha(c)]))
  }
  const deploy = async (store: ReturnType<typeof createDeployStore>, files: Record<string, string>) => {
    const manifest = await manifestOf(store, files)
    return store.apply(manifest, await store.stage(manifest))
  }

  it('writes node_modules as plain files, then deletes a removed package', async () => {
    const store = createDeployStore(storeDir, instanceDir)
    const v1 = {
      'pb_hooks/main.pb.js': 'hook',
      'node_modules/marked/package.json': '{"name":"marked"}',
      'node_modules/marked/lib/marked.cjs': 'marked',
      'node_modules/a/node_modules/b/index.js': 'b',
      'node_modules/@s/x/index.js': 'x',
    }
    const r1 = await deploy(store, v1)
    expect(r1.written).toHaveLength(5)
    expect(r1.replacedNodeModules).toBe(false)
    expect(read('node_modules/marked/lib/marked.cjs')).toBe('marked')
    expect(read('node_modules/a/node_modules/b/index.js')).toBe('b')
    expect(lstatSync(join(instanceDir, 'node_modules/@s/x/index.js')).isFile()).toBe(true)

    const { 'node_modules/marked/package.json': _p, 'node_modules/marked/lib/marked.cjs': _m, ...v2 } = v1
    const r2 = await deploy(store, { ...v2, 'node_modules/@s/x/index.js': 'x2' })
    expect(r2.deleted).toEqual(['node_modules/marked/lib/marked.cjs', 'node_modules/marked/package.json'])
    expect(r2.written).toEqual(['node_modules/@s/x/index.js'])
    expect(r2.unchanged).toBe(2)
    expect(has('node_modules/marked')).toBe(false)
    expect(read('node_modules/@s/x/index.js')).toBe('x2')
    expect(readdirSync(join(storeDir, 'tmp'))).toEqual([])
  })

  it('leaves an existing node_modules alone when the manifest has no node_modules paths', async () => {
    put('node_modules/old/index.js', 'server-installed')
    mkdirSync(join(instanceDir, 'node_modules/.bin'), { recursive: true })
    symlinkSync('../old/index.js', join(instanceDir, 'node_modules/.bin/old'))
    const store = createDeployStore(storeDir, instanceDir)
    const manifest = await manifestOf(store, { 'pb_hooks/main.pb.js': 'hook' })
    expect([...(await store.scanCurrent(manifest)).keys()]).toEqual([])
    const r = await store.apply(manifest, await store.stage(manifest))
    expect(r).toMatchObject({ written: ['pb_hooks/main.pb.js'], deleted: [], replacedNodeModules: false })
    expect(read('node_modules/old/index.js')).toBe('server-installed')
    expect(readlinkSync(join(instanceDir, 'node_modules/.bin/old'))).toBe('../old/index.js')
  })

  it('empties node_modules when the client manages it but ships no packages', async () => {
    put('node_modules/old/index.js', 'old')
    put('node_modules/@s/x/index.js', 'x')
    const store = createDeployStore(storeDir, instanceDir)
    const manifest = await manifestOf(store, { 'pb_hooks/main.pb.js': 'hook' })
    const r = await store.apply(manifest, await store.stage(manifest, { nodeModules: true }))
    expect(r).toMatchObject({
      written: ['pb_hooks/main.pb.js'],
      deleted: ['node_modules/@s/x/index.js', 'node_modules/old/index.js'],
      replacedNodeModules: false,
    })
    expect(readdirSync(join(instanceDir, 'node_modules'))).toEqual([])
  })

  it('replaces a symlinked node_modules when the client manages it but ships no packages', async () => {
    put('node_modules/old/index.js', 'old')
    mkdirSync(join(instanceDir, 'node_modules/.bin'), { recursive: true })
    symlinkSync('../old/index.js', join(instanceDir, 'node_modules/.bin/old'))
    const store = createDeployStore(storeDir, instanceDir)
    const manifest = await manifestOf(store, { 'pb_hooks/main.pb.js': 'hook' })
    const r = await store.apply(manifest, await store.stage(manifest, { nodeModules: true }))
    expect(r.replacedNodeModules).toBe(true)
    expect(has('node_modules')).toBe(false)
    expect(read('pb_hooks/main.pb.js')).toBe('hook')
  })

  it('recognises unchanged node_modules files by hash and cleans up stale ones', async () => {
    put('node_modules/keep/index.js', 'keep')
    put('node_modules/stale/index.js', 'stale')
    const store = createDeployStore(storeDir, instanceDir)
    const manifest = { 'node_modules/keep/index.js': sha('keep') }
    // Nothing to upload: the file is already on disk.
    expect(await store.findMissing(manifest)).toEqual([])
    const r = await store.apply(manifest, await store.stage(manifest))
    expect(r).toMatchObject({ written: [], deleted: ['node_modules/stale/index.js'], unchanged: 1 })
    expect(has('node_modules/stale')).toBe(false)
  })

  const oldBunInstall = () => {
    put('node_modules/old/index.js', 'old')
    put('node_modules/marked/lib/marked.cjs', 'marked')
    put('outside/secret.txt', 'secret')
    mkdirSync(join(instanceDir, 'node_modules/.bin'), { recursive: true })
    symlinkSync('../old/index.js', join(instanceDir, 'node_modules/.bin/old'))
    symlinkSync(join(instanceDir, 'outside'), join(instanceDir, 'node_modules/linked'))
  }

  it('replaces an old node_modules that holds symlinks, reusing its files as sources', async () => {
    oldBunInstall()
    const store = createDeployStore(storeDir, instanceDir)
    // marked.cjs is reused from the old tree; only the new file needs uploading.
    const manifest = { 'node_modules/marked/lib/marked.cjs': sha('marked'), 'node_modules/new/index.js': sha('new') }
    expect(await store.findMissing(manifest)).toEqual([sha('new')])
    await store.putBlob(sha('new'), Buffer.from('new'))
    const r = await store.apply(manifest, await store.stage(manifest))
    expect(r.replacedNodeModules).toBe(true)
    expect(r.written).toEqual(['node_modules/marked/lib/marked.cjs', 'node_modules/new/index.js'])
    expect(readdirSync(join(instanceDir, 'node_modules')).sort()).toEqual(['marked', 'new'])
    expect(read('node_modules/marked/lib/marked.cjs')).toBe('marked')
    expect(read('outside/secret.txt')).toBe('secret')
    expect(readdirSync(join(storeDir, 'tmp'))).toEqual([])

    // The rebuilt tree is plain files, so the next deploy diffs it file by file.
    const again = await store.apply(manifest, await store.stage(manifest))
    expect(again).toMatchObject({ written: [], deleted: [], unchanged: 2, replacedNodeModules: false })
  })

  it('replaces a node_modules that is itself a symlink', async () => {
    put('elsewhere/x.js', 'x')
    symlinkSync(join(instanceDir, 'elsewhere'), join(instanceDir, 'node_modules'))
    const store = createDeployStore(storeDir, instanceDir)
    const r = await deploy(store, { 'node_modules/y/index.js': 'y' })
    expect(r.replacedNodeModules).toBe(true)
    expect(lstatSync(join(instanceDir, 'node_modules')).isDirectory()).toBe(true)
    expect(readdirSync(join(instanceDir, 'node_modules'))).toEqual(['y'])
    expect(read('elsewhere/x.js')).toBe('x')
  })

  it('restores the old node_modules (symlinks included) when apply fails', async () => {
    oldBunInstall()
    put('pb_public/blocker/node_modules/x.js', 'kept')
    const store = createDeployStore(storeDir, instanceDir)
    // node_modules/* sorts before pb_public/blocker, so it is written before the blocker makes apply fail.
    const manifest = await manifestOf(store, { 'node_modules/new/index.js': 'new', 'pb_public/blocker': 'X' })
    const staged = await store.stage(manifest)
    await expect(store.apply(manifest, staged)).rejects.toBeInstanceOf(DeployConflictError)
    expect(readdirSync(join(instanceDir, 'node_modules')).sort()).toEqual(['.bin', 'linked', 'marked', 'old'])
    expect(readlinkSync(join(instanceDir, 'node_modules/.bin/old'))).toBe('../old/index.js')
    expect(lstatSync(join(instanceDir, 'node_modules/linked')).isSymbolicLink()).toBe(true)
    expect(read('node_modules/old/index.js')).toBe('old')
    expect(read('pb_public/blocker/node_modules/x.js')).toBe('kept')
  })

  it('never walks or deletes node_modules inside code folders', async () => {
    put('pb_hooks/node_modules/dep/index.js', 'dep')
    const store = createDeployStore(storeDir, instanceDir)
    const r = await deploy(store, { 'node_modules/y/index.js': 'y', 'pb_hooks/main.pb.js': 'hook' })
    expect(r.deleted).toEqual([])
    expect(read('pb_hooks/node_modules/dep/index.js')).toBe('dep')
  })
})
