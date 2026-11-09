import express from 'express'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DeployAuthError, type DeployAuth } from './auth'
import { createDeployStore } from './deployStore'
import { isFileApiPath } from './filesRouter'
import { createDeployRouter, DEPLOY_API_PREFIX, type DeployRouterDeps } from './router'

const noop = () => {}
const logger: any = { create: () => logger, dbg: noop, info: noop, warn: noop, error: noop, trace: noop }

let instance: any
let root: string
let app: express.Express
const authFor: Record<string, DeployAuth> = {
  good: { userId: 'user1', scopes: ['read', 'write'], instanceIds: null, via: 'pat', tokenLabel: 'CI' },
  ro: { userId: 'user1', scopes: ['read'], instanceIds: null, via: 'pat', tokenLabel: 'RO' },
  stranger: { userId: 'user2', scopes: ['read', 'write'], instanceIds: null, via: 'pat', tokenLabel: 'X' },
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'ph-files-router-'))
  instance = { id: 'inst1', uid: 'user1', subdomain: 'myapp', power: true, suspension: '' }
  const deps: DeployRouterDeps = {
    resolveAuth: async (authorization) => {
      const a = authFor[authorization?.replace('Bearer ', '') ?? '']
      if (!a) throw new DeployAuthError(401, 'Invalid or expired token.')
      return a
    },
    getInstanceByHost: async (host) => (host === 'myapp.pockethost.test' ? instance : undefined),
    getUser: async () => ({ suspension: '' }),
    storeFor: (i) => createDeployStore(join(root, 'deploys', i.id), join(root, 'instances', i.id)),
    withInstanceStopped: vi.fn(async (_i, fn) => ({ result: await fn(), wasRunning: true })),
    startInstance: vi.fn(async () => {}),
    recordDeploy: vi.fn(async () => 'dep123'),
    logger,
  }
  app = express()
  app.use(DEPLOY_API_PREFIX, createDeployRouter(deps))
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

const instFile = (rel: string) => join(root, 'instances', 'inst1', rel)
const put = (rel: string, content: string) => {
  mkdirSync(dirname(instFile(rel)), { recursive: true })
  writeFileSync(instFile(rel), content)
}
const api = (method: 'get' | 'put' | 'delete', path: string, token = 'good') =>
  request(app)
    [method](`${DEPLOY_API_PREFIX}/files${path}`)
    .set('Host', 'myapp.pockethost.test')
    .set('Authorization', `Bearer ${token}`)

describe('isFileApiPath', () => {
  it('allows the code set and pb_data, nothing else', () => {
    for (const p of [
      'pb_hooks',
      'pb_hooks/a.pb.js',
      'pb_data',
      'pb_data/data.db',
      'package.json',
      'patches',
      'patches/x.patch',
      'pb_public/.well-known/x',
      'node_modules/pocketpages/index.js',
      'pb_hooks/node_modules/x/y.js',
    ])
      expect(isFileApiPath(p), p).toBe(true)
    for (const p of [
      '',
      'logs',
      'pocketbase',
      '../x',
      'pb_hooks/../pb_data/data.db',
      '/pb_hooks',
      'pb_public/.git/config',
      'node_modules/.git/x',
      '.git/config',
    ])
      expect(isFileApiPath(p), p).toBe(false)
  })
})

describe('files router', () => {
  it('lists the root and recursive folders, hiding pb_data contents while powered on', async () => {
    put('pb_hooks/main.pb.js', 'hook')
    put('pb_hooks/lib/util.js', 'util')
    put('pb_data/data.db', 'db')
    put('logs/exec.log', 'secret')
    const top = await api('get', '/').expect(200)
    expect(top.body.entries.map((e: any) => e.path)).toEqual(['pb_data', 'pb_hooks'])
    const rec = await api('get', '/?path=pb_hooks&recursive=1').expect(200)
    expect(rec.body.entries.map((e: any) => e.path)).toEqual([
      'pb_hooks/lib',
      'pb_hooks/lib/util.js',
      'pb_hooks/main.pb.js',
    ])
    const all = await api('get', '/?recursive=1').expect(200)
    expect(all.body.entries.map((e: any) => e.path)).not.toContain('pb_data/data.db')
    await api('get', '/?path=pb_data').expect(409)
    await api('get', '/?path=logs').expect(400)
  })

  it('downloads files with a read-only token', async () => {
    put('pb_hooks/main.pb.js', 'hello')
    const res = await api('get', '/raw?path=pb_hooks/main.pb.js', 'ro').expect(200)
    expect(Buffer.from(res.body).toString()).toBe('hello')
    await api('get', '/raw?path=pb_hooks/nope.js').expect(404)
    await api('get', '/raw?path=pb_hooks').expect(400)
  })

  it('uploads in chunks, enforces order, and only reaches pb_data when powered off', async () => {
    await api('put', '/raw?path=pb_data/data.db&offset=0&final=1').send(Buffer.from('x')).expect(409)
    instance.power = false
    await api('put', '/raw?path=pb_data/data.db&offset=0')
      .type('application/octet-stream')
      .send(Buffer.from('abc'))
      .expect(200)
    await api('put', '/raw?path=pb_data/data.db&offset=5')
      .type('application/octet-stream')
      .send(Buffer.from('zz'))
      .expect(409)
    expect(existsSync(instFile('pb_data/data.db'))).toBe(false)
    const done = await api('put', '/raw?path=pb_data/data.db&offset=3&final=1')
      .type('application/octet-stream')
      .send(Buffer.from('def'))
      .expect(200)
    expect(done.body.size).toBe(6)
    expect(readFileSync(instFile('pb_data/data.db'), 'utf8')).toBe('abcdef')
    expect(existsSync(instFile('pb_data/data.db.ph-upload'))).toBe(false)
    const dl = await api('get', '/raw?path=pb_data/data.db').expect(200)
    expect(Buffer.from(dl.body).toString()).toBe('abcdef')
  })

  it('rejects writes from read-only tokens and strangers', async () => {
    await api('put', '/raw?path=pb_hooks/a.js&final=1', 'ro').send(Buffer.from('x')).expect(403)
    await api('get', '/', 'stranger').expect(404)
    await api('get', '/', 'nobody').expect(401)
  })

  it('deletes files and folders, never top-level roots', async () => {
    put('pb_migrations/1_bad.js', 'boom')
    put('pb_public/a/b.txt', 'b')
    await api('delete', '/?path=pb_migrations/1_bad.js').expect(200)
    expect(existsSync(instFile('pb_migrations/1_bad.js'))).toBe(false)
    await api('delete', '/?path=pb_public/a').expect(409)
    await api('delete', '/?path=pb_public/a&recursive=1').expect(200)
    expect(existsSync(instFile('pb_public/a'))).toBe(false)
    await api('delete', '/?path=pb_public').expect(400)
    await api('delete', '/?path=pb_public/missing').expect(404)
    await api('delete', '/?path=pb_public/x', 'ro').expect(403)
  })

  it('refuses symlinks out of the instance', async () => {
    mkdirSync(instFile('pb_public'), { recursive: true })
    mkdirSync(join(root, 'outside'))
    writeFileSync(join(root, 'outside', 'secret'), 's')
    symlinkSync(join(root, 'outside'), instFile('pb_public/link'))
    await api('get', '/raw?path=pb_public/link/secret').expect(400)
    await api('put', '/raw?path=pb_public/link/new&final=1').send(Buffer.from('x')).expect(400)
    const list = await api('get', '/?path=pb_public&recursive=1').expect(200)
    expect(list.body.entries).toEqual([])
  })
})
