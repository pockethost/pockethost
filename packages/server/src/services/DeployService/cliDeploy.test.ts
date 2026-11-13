/**
 * The published CLI's deploy code (packages/cli) against the real deploy router over HTTP, with a stubbed instance
 * controller. Keeps the client and server halves of the protocol in step.
 */
import express from 'express'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'fs'
import type { AddressInfo } from 'net'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { isCodePath as cliIsCodePath } from '../../../../cli/src/lib/codeSet'
import { deployViaApi } from '../../../../cli/src/lib/deployApi'
import { DEFAULT_EXCLUDES, DEFAULT_INCLUDES } from '../../../../cli/src/lib/deployIncludes'
import { DeployAuthError } from './auth'
import { isCodePath as serverIsCodePath } from './codeSet'
import { codeSetParityPaths } from './codeSetParity'
import { createDeployStore } from './deployStore'
import { createDeployRouter, DEPLOY_API_PREFIX } from './router'

const noop = () => {}
const logger: any = { create: () => logger, dbg: noop, info: noop, warn: noop, error: noop }
const TOKEN = `ph_pat_abcdefghij12345_${'B'.repeat(43)}`

let root: string
let project: string
let server: ReturnType<express.Express['listen']>
const startInstance = vi.fn(async () => {})
const recordDeploy = vi.fn(async () => `dep${recordDeploy.mock.calls.length}`)
const env = { ...process.env }

const projectFile = (rel: string, content: string) => {
  const p = join(project, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, content)
}
const instFile = (rel: string) => join(root, 'instances', 'inst1', rel)

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'ph-cli-deploy-'))
  project = join(root, 'project')
  mkdirSync(project)
  const instance = { id: 'inst1', uid: 'user1', subdomain: 'myapp', power: true, suspension: '' } as any
  const app = express()
  app.use(
    DEPLOY_API_PREFIX,
    createDeployRouter({
      resolveAuth: async (authorization) => {
        if (authorization !== `Bearer ${TOKEN}`) throw new DeployAuthError(401, 'Invalid or expired token.')
        return { userId: 'user1', scopes: ['read', 'write'], instanceIds: null, via: 'pat', tokenLabel: 'CI' }
      },
      getInstanceByHost: async (host) => (host === 'myapp.localhost' ? instance : undefined),
      getUser: async () => ({}),
      storeFor: (i) => createDeployStore(join(root, 'deploys', i.id), join(root, 'instances', i.id)),
      withInstanceStopped: async (_i, fn) => ({ result: await fn(), wasRunning: true }),
      startInstance,
      recordDeploy,
      logger,
    })
  )
  server = app.listen(0, '::')
  await new Promise((r) => server.once('listening', r))
  const port = (server.address() as AddressInfo).port
  process.env.POCKETHOST_MOTHERSHIP_URL = `http://central.localhost:${port}`
  process.env.POCKETHOST_HOME = join(root, 'home')
  process.env.POCKETHOST_TOKEN = TOKEN
  delete process.env.GITHUB_SHA
  delete process.env.GITHUB_ACTIONS
})

afterAll(() => {
  server?.close()
  process.env = env
  rmSync(root, { recursive: true, force: true })
})

const deploy = (extra: Partial<Parameters<typeof deployViaApi>[0]> = {}) =>
  deployViaApi({
    instanceName: 'myapp',
    include: DEFAULT_INCLUDES,
    exclude: DEFAULT_EXCLUDES,
    cwd: project,
    commit: 'deadbeef',
    log: noop,
    ...extra,
  })

describe('CLI deploy over the deploy API', () => {
  it('deploys, then uploads only changes, then deletes removed files', async () => {
    projectFile('pb_hooks/main.pb.js', 'routerAdd()')
    projectFile('pb_migrations/1_init.js', 'migrate()')
    projectFile('pb_public/index.html', '<h1>v1</h1>')
    projectFile('package.json', '{"name":"x"}')
    projectFile('pb_data/data.db', 'LOCAL DB MUST NOT SHIP')
    projectFile('node_modules/dep/index.js', 'no')
    projectFile('README.md', 'not deployed')
    projectFile('pb_public/.well-known/security.txt', 'contact')
    projectFile('pb_public/.gitignore', 'ignored')
    mkdirSync(dirname(instFile('pb_data/data.db')), { recursive: true })
    writeFileSync(instFile('pb_data/data.db'), 'REMOTE DB')

    const first = await deploy()
    expect(first).toMatchObject({ writtenCount: 5, deletedCount: 0, restarted: true })
    expect(readFileSync(instFile('pb_public/.well-known/security.txt'), 'utf8')).toBe('contact')
    expect(existsSync(instFile('pb_public/.gitignore'))).toBe(false)
    expect(readFileSync(instFile('pb_hooks/main.pb.js'), 'utf8')).toBe('routerAdd()')
    expect(readFileSync(instFile('pb_data/data.db'), 'utf8')).toBe('REMOTE DB')
    expect(existsSync(instFile('node_modules'))).toBe(false)
    expect(existsSync(instFile('README.md'))).toBe(false)
    expect(recordDeploy).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'success', file_count: 5, uploaded_count: 5, commit: 'deadbeef' })
    )

    projectFile('pb_public/index.html', '<h1>v2</h1>')
    unlinkSync(join(project, 'pb_migrations/1_init.js'))
    const logs: string[] = []
    const second = await deploy({ yes: true, log: (m) => logs.push(m) })
    expect(second).toMatchObject({ writtenCount: 1, deletedCount: 1, unchanged: 3 })
    expect(recordDeploy).toHaveBeenLastCalledWith(expect.objectContaining({ uploaded_count: 1 }))
    expect(readFileSync(instFile('pb_public/index.html'), 'utf8')).toBe('<h1>v2</h1>')
    expect(existsSync(instFile('pb_migrations/1_init.js'))).toBe(false)
    expect(logs.some((l) => l.includes('Uploading 1 file'))).toBe(true)

    const third = await deploy()
    expect(third!.nothingChanged).toBe(true)
  })

  it('asks before deleting remote files missing locally; -y skips the question', async () => {
    projectFile('pb_hooks/keep.pb.js', 'keep()')
    projectFile('pb_hooks/gone.pb.js', 'gone()')
    await deploy({ yes: true })
    unlinkSync(join(project, 'pb_hooks/gone.pb.js'))

    // declined: nothing is deployed, the remote file stays
    const asked: string[][] = []
    const logs: string[] = []
    const declined = await deploy({
      log: (m) => logs.push(m),
      confirmDeletes: async (paths) => {
        asked.push(paths)
        return false
      },
    })
    expect(declined).toBeNull()
    expect(asked).toEqual([['pb_hooks/gone.pb.js']])
    expect(logs.some((l) => l.includes('- pb_hooks/gone.pb.js'))).toBe(true)
    expect(existsSync(instFile('pb_hooks/gone.pb.js'))).toBe(true)

    // no TTY and no -y: refuse
    await expect(deploy()).rejects.toThrow(/would delete 1 file\(s\) on myapp\. Add -y/)
    expect(existsSync(instFile('pb_hooks/gone.pb.js'))).toBe(true)

    // confirmed
    const ok = await deploy({ confirmDeletes: async () => true })
    expect(ok).toMatchObject({ deletedCount: 1 })
    expect(existsSync(instFile('pb_hooks/gone.pb.js'))).toBe(false)

    // -y: no question
    projectFile('pb_hooks/gone2.pb.js', 'x')
    await deploy({ yes: true })
    unlinkSync(join(project, 'pb_hooks/gone2.pb.js'))
    const forced = await deploy({
      yes: true,
      confirmDeletes: async () => {
        throw new Error('must not ask with -y')
      },
    })
    expect(forced).toMatchObject({ deletedCount: 1 })
  })

  it('reports a rejected token clearly', async () => {
    process.env.POCKETHOST_TOKEN = `ph_pat_abcdefghij12345_${'C'.repeat(43)}`
    await expect(deploy()).rejects.toThrow(/Authentication failed \(POCKETHOST_TOKEN\)/)
    process.env.POCKETHOST_TOKEN = TOKEN
  })

  it('reports an unknown instance clearly', async () => {
    await expect(deploy({ instanceName: 'nope' })).rejects.toThrow(/Instance 'nope' not found/)
  })

  it('a CLI deploy with --no-node-modules leaves the instance node_modules alone', async () => {
    // e.g. packages installed by the old server-side `bun install`, with a .bin symlink.
    mkdirSync(dirname(instFile('node_modules/old/index.js')), { recursive: true })
    writeFileSync(instFile('node_modules/old/index.js'), 'server-installed')
    mkdirSync(instFile('node_modules/.bin'), { recursive: true })
    symlinkSync('../old/index.js', instFile('node_modules/.bin/old'))
    projectFile('pb_hooks/main.pb.js', 'routerAdd(2)')
    const r = await deploy({ nodeModules: false })
    expect(r).toMatchObject({ writtenCount: 1, deletedCount: 0 })
    expect(readFileSync(instFile('node_modules/old/index.js'), 'utf8')).toBe('server-installed')
    expect(readlinkSync(instFile('node_modules/.bin/old'))).toBe('../old/index.js')
  })

  it('a project with a package.json but no dependencies empties the instance node_modules', async () => {
    // Continues from the previous test: node_modules/old is still on the instance.
    const logs: string[] = []
    // Nothing else changed: moving the symlinked node_modules aside alone counts as a change and stops the instance.
    const r = await deploy({ log: (m) => logs.push(m) })
    expect(r).toMatchObject({ nothingChanged: false, replacedNodeModules: true, restarted: true })
    expect(existsSync(instFile('node_modules/old'))).toBe(false)
    expect(existsSync(instFile('node_modules/.bin'))).toBe(false)
    expect(logs.some((l) => l.includes('any on the server will be removed'))).toBe(true)
  })

  it('CLI and server agree on the code set', () => {
    for (const p of codeSetParityPaths) expect([p, cliIsCodePath(p)]).toEqual([p, serverIsCodePath(p)])
  })
})
