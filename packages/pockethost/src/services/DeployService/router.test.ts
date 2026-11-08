import { createHash } from 'crypto'
import express from 'express'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gzipSync } from 'zlib'
import { DeployAuthError, type DeployAuth } from './auth'
import { encodeBundle } from './bundle'
import { createDeployStore } from './deployStore'
import { createDeployRouter, DEPLOY_API_PREFIX, type DeployRouterDeps } from './router'

const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const noop = () => {}
const logger: any = { create: () => logger, dbg: noop, info: noop, warn: noop, error: noop, trace: noop }

const instance = { id: 'inst1', uid: 'user1', subdomain: 'myapp', power: true, suspension: '' } as any
const other = { id: 'inst2', uid: 'user1', subdomain: 'other', power: true, suspension: '' } as any

let root: string
let deps: DeployRouterDeps
let app: express.Express
let authFor: Record<string, DeployAuth>

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'ph-deploy-router-'))
  authFor = {
    good: { userId: 'user1', scopes: ['read', 'write'], instanceIds: ['inst1'], via: 'pat', tokenLabel: 'CI' },
    ro: { userId: 'user1', scopes: ['read'], instanceIds: null, via: 'pat', tokenLabel: 'RO' },
    stranger: { userId: 'user2', scopes: ['read', 'write'], instanceIds: null, via: 'pat', tokenLabel: 'X' },
  }
  deps = {
    resolveAuth: async (authorization) => {
      const t = authorization?.replace('Bearer ', '') ?? ''
      const a = authFor[t]
      if (!a) throw new DeployAuthError(401, 'Invalid or expired token.')
      return a
    },
    getInstanceByHost: async (host) => ({ 'myapp.pockethost.test': instance, 'other.pockethost.test': other })[host],
    getUser: async () => ({ suspension: '' }),
    storeFor: (i) => createDeployStore(join(root, 'deploys', i.id), join(root, 'instances', i.id)),
    withInstanceStopped: vi.fn(async (_i, fn) => ({ result: await fn(), wasRunning: true })),
    startInstance: vi.fn(async () => {}),
    bunInstall: vi.fn(async () => {}),
    recordDeploy: vi.fn(async () => 'dep123'),
    logger,
  }
  app = express()
  app.use(DEPLOY_API_PREFIX, createDeployRouter(deps))
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

const host = 'myapp.pockethost.test'
const api = (method: 'get' | 'post', path: string, token = 'good') =>
  request(app)[method](`${DEPLOY_API_PREFIX}${path}`).set('Host', host).set('Authorization', `Bearer ${token}`)

const instFile = (rel: string) => join(root, 'instances', 'inst1', rel)

describe('deploy router', () => {
  it('runs check → blobs → commit end to end', async () => {
    mkdirSync(dirname(instFile('pb_hooks/old.pb.js')), { recursive: true })
    writeFileSync(instFile('pb_hooks/old.pb.js'), 'old')
    mkdirSync(dirname(instFile('pb_data/data.db')), { recursive: true })
    writeFileSync(instFile('pb_data/data.db'), 'db')

    const files = { 'pb_hooks/main.pb.js': sha('main'), 'package.json': sha('{}') }
    const check = await api('post', '/check').send({ files })
    expect(check.status).toBe(200)
    expect(check.body.missing.sort()).toEqual([sha('main'), sha('{}')].sort())

    const bundle = gzipSync(encodeBundle([{ data: Buffer.from('main') }, { data: Buffer.from('{}') }]))
    const up = await api('post', '/blobs').set('Content-Type', 'application/octet-stream').send(bundle)
    expect(up.status).toBe(200)
    expect(up.body).toEqual({ received: 2, stored: 2 })

    const again = await api('post', '/check').send({ files })
    expect(again.body.missing).toEqual([])

    const commit = await api('post', '/commit').send({ files, commit: 'abc123', source: 'github-actions' })
    expect(commit.status).toBe(200)
    expect(commit.body).toMatchObject({
      deployId: 'dep123',
      writtenCount: 2,
      deletedCount: 1,
      packagesChanged: true,
      wasRunning: true,
      restarted: true,
    })
    expect(readFileSync(instFile('pb_hooks/main.pb.js'), 'utf8')).toBe('main')
    expect(existsSync(instFile('pb_hooks/old.pb.js'))).toBe(false)
    expect(readFileSync(instFile('pb_data/data.db'), 'utf8')).toBe('db')
    expect(deps.bunInstall).toHaveBeenCalledTimes(1)
    expect(deps.startInstance).toHaveBeenCalledTimes(1)
    expect(deps.recordDeploy).toHaveBeenCalledWith(
      expect.objectContaining({
        instance: 'inst1',
        user: 'user1',
        status: 'success',
        file_count: 2,
        commit: 'abc123',
        token_label: 'CI',
      })
    )

    // Redeploying the same files changes nothing and doesn't stop the instance.
    ;(deps.withInstanceStopped as any).mockClear()
    ;(deps.recordDeploy as any).mockClear()
    const noop = await api('post', '/commit').send({ files })
    expect(noop.body).toMatchObject({ deployId: null, nothingChanged: true, writtenCount: 0, deletedCount: 0 })
    expect(deps.recordDeploy).not.toHaveBeenCalled()
    expect(deps.withInstanceStopped).not.toHaveBeenCalled()
  })

  it('applies pb_public-only changes without stopping the instance', async () => {
    const files = { 'pb_public/index.html': sha('hi') }
    await api('post', '/blobs')
      .set('Content-Type', 'application/octet-stream')
      .send(gzipSync(encodeBundle([{ data: Buffer.from('hi') }])))
    const res = await api('post', '/commit').send({ files })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ writtenCount: 1, wasRunning: false, restarted: false })
    expect(deps.withInstanceStopped).not.toHaveBeenCalled()
    expect(readFileSync(instFile('pb_public/index.html'), 'utf8')).toBe('hi')
  })

  it('returns 409 with missing hashes when commit runs before upload', async () => {
    const res = await api('post', '/commit').send({ files: { 'pb_hooks/a.pb.js': sha('a') } })
    expect(res.status).toBe(409)
    expect(res.body.missing).toEqual([sha('a')])
  })

  it('rejects bad auth, wrong owner, out-of-scope and read-only tokens', async () => {
    expect((await api('post', '/check', 'nope').send({ files: {} })).status).toBe(401)
    expect((await api('post', '/check', 'stranger').send({ files: {} })).status).toBe(404)
    expect((await api('post', '/check', 'ro').send({ files: {} })).status).toBe(403)
    const scoped = await request(app)
      .post(`${DEPLOY_API_PREFIX}/check`)
      .set('Host', 'other.pockethost.test')
      .set('Authorization', 'Bearer good')
      .send({ files: {} })
    expect(scoped.status).toBe(404)
    expect((await api('get', '/whoami', 'ro')).status).toBe(200)
  })

  it('rejects unknown hosts, suspended accounts, pb_data paths and junk uploads', async () => {
    const unknown = await request(app).post(`${DEPLOY_API_PREFIX}/check`).set('Host', 'nope.test').send({ files: {} })
    expect(unknown.status).toBe(404)

    expect((await api('post', '/check').send({ files: { 'pb_data/data.db': sha('x') } })).status).toBe(400)
    expect(
      (await api('post', '/blobs').set('Content-Type', 'application/octet-stream').send(Buffer.from('junk'))).status
    ).toBe(400)

    deps.getUser = async () => ({ suspension: 'Account suspended' })
    app = express()
    app.use(DEPLOY_API_PREFIX, createDeployRouter(deps))
    const res = await api('post', '/check').send({ files: {} })
    expect(res.status).toBe(403)
    expect(res.body.message).toBe('Account suspended')
  })

  it('records a failed deploy and keeps files when apply fails', async () => {
    mkdirSync(instFile('pb_public/blocker/node_modules'), { recursive: true })
    writeFileSync(instFile('pb_public/blocker/node_modules/x.js'), 'x')
    const files = { 'pb_public/blocker': sha('b') }
    await api('post', '/blobs')
      .set('Content-Type', 'application/octet-stream')
      .send(gzipSync(encodeBundle([{ data: Buffer.from('b') }])))
    const res = await api('post', '/commit').send({ files })
    expect(res.status).toBe(409)
    expect(deps.recordDeploy).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
    expect(readFileSync(instFile('pb_public/blocker/node_modules/x.js'), 'utf8')).toBe('x')
  })
})
