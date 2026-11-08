import { execFileSync } from 'child_process'
import { existsSync, lstatSync } from 'fs'
import { readFile } from 'fs/promises'
import { globSync } from 'glob'
import { join, sep } from 'path'
import prettyBytes from 'pretty-bytes'
import { gzipSync } from 'zlib'
import { version } from '../../package.json'
import { excludeDefaults } from '../../vendor/ftp-deploy/module.js'
import { isCodePath } from './codeSet'
import { INSTANCE_URL } from './constants'
import { mergeDeployExcludes } from './deployIncludes'
import { batchBySize, encodeBundle, sha256 } from './deployBundle'
import { collectNodeModules, type NodeModulesResult } from './nodeModules'
import { resolveDeployCredential, type DeployCredential } from './token'

export const DEPLOY_API_PREFIX = '/_ph/deploy/v1'
/** Raw bytes per upload request (gzip makes it smaller; Cloudflare allows 100 MB). */
export const UPLOAD_BATCH_BYTES = 32 * 1024 * 1024

export type LocalFile = {
  /** Logical path relative to the instance root */
  path: string
  hash: string
  size: number
  /** Absolute path of the real file on disk (differs from `path` for node_modules entries) */
  source: string
}

export type DeployApiOptions = {
  instanceName: string
  include: string[]
  exclude: string[]
  verbose?: boolean
  /**
   * Ship the production node_modules tree (see nodeModules.ts) and let the server manage the instance's root
   * node_modules, removing packages no longer shipped. Default: when the project has a package.json.
   */
  nodeModules?: boolean
  commit?: string
  message?: string
  cwd?: string
  log?: (msg: string) => void
}

export type CommitResult = {
  deployId: string | null
  instance: { id: string; subdomain: string }
  fileCount: number
  written: string[]
  deleted: string[]
  writtenCount: number
  deletedCount: number
  unchanged: number
  totalBytes: number
  nothingChanged: boolean
  wasRunning: boolean
  restarted: boolean
  startError?: string
}

export class DeployApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: Record<string, unknown> = {}
  ) {
    super(message)
  }
}

/**
 * Lists local files with the same include/exclude rules as the SFTP deploy (plus dotfiles; `.git*` and node_modules
 * stay excluded), then hashes them. With `nodeModules`, also adds the production node_modules tree as plain files.
 */
export const collectLocalFiles = async (
  include: string[],
  exclude: string[],
  cwd = process.cwd(),
  options: { nodeModules?: boolean } = {}
) => {
  const matches = globSync(include, {
    ignore: mergeDeployExcludes(excludeDefaults, exclude),
    cwd,
    nodir: true,
    // The server deletes code-set files missing from the manifest, so dotfiles (pb_public/.well-known/…) must ship.
    dot: true,
  })
  const files: LocalFile[] = []
  const skipped: string[] = []
  for (const raw of [...new Set(matches)].sort()) {
    const path = raw.split(sep).join('/')
    const abs = `${cwd}/${path}`
    const st = lstatSync(abs)
    if (!st.isFile()) {
      skipped.push(path)
      continue
    }
    if (!isCodePath(path)) {
      skipped.push(path)
      continue
    }
    files.push({
      path,
      size: st.size,
      hash: sha256(await readFile(abs)),
      source: abs,
    })
  }
  let nodeModules: NodeModulesResult | null = null
  // With a package.json the deploy owns node_modules, even with no dependencies (so removed packages are cleaned up).
  if (options.nodeModules ?? existsSync(join(cwd, 'package.json'))) {
    nodeModules = collectNodeModules(cwd)
    for (const f of nodeModules.files) {
      const data = await readFile(f.source)
      files.push({
        path: f.path,
        size: data.length,
        hash: sha256(data),
        source: f.source,
      })
    }
  }
  return { files, skipped, nodeModules }
}

export const assertNodeModulesComplete = (nm: NodeModulesResult | null) => {
  if (nm && nm.missing.length > 0) {
    throw new Error(
      `Not deploying: ${nm.missing.length} required package(s) are missing from node_modules`
    )
  }
}

/** One-line summary of the node_modules part of a deploy set, plus a warning for missing packages. */
export const describeNodeModules = (nm: NodeModulesResult | null) => {
  if (!nm) return []
  const lines = [
    nm.packages.length === 0
      ? `📦 node_modules: no packages (any on the server will be removed)`
      : `📦 node_modules: ${nm.packages.length} package(s), ${nm.files.length} file(s)`,
  ]
  if (nm.missing.length > 0) {
    lines.push(
      `⚠️  ${nm.missing.length} required package(s) not installed: ${nm.missing
        .map((m) => `${m.name} (required by ${m.requiredBy})`)
        .join(', ')}. Run your package manager's install first.`
    )
  }
  return lines
}

const detectCommit = (cwd: string) => {
  const fromEnv = process.env.GITHUB_SHA || process.env.CI_COMMIT_SHA
  if (fromEnv) return fromEnv
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    return ''
  }
}

const detectSource = () =>
  process.env.GITHUB_ACTIONS
    ? 'github-actions'
    : process.env.CI
      ? 'ci'
      : `cli/${version}`

export const createDeployClient = (
  instanceName: string,
  cred: DeployCredential
) => {
  const base = `${INSTANCE_URL(instanceName)}${DEPLOY_API_PREFIX}`
  const headers = {
    Authorization: `Bearer ${cred.token}`,
    'User-Agent': `pockethost-cli/${version}`,
  }

  const call = async <T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    raw?: Buffer
  ): Promise<T> => {
    let res: Response
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers: {
          ...headers,
          ...(raw
            ? { 'Content-Type': 'application/octet-stream' }
            : body !== undefined
              ? { 'Content-Type': 'application/json' }
              : {}),
        },
        body: raw
          ? new Uint8Array(raw)
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
      })
    } catch (e) {
      throw new DeployApiError(
        0,
        `Could not reach ${base}: ${(e as Error).message}`
      )
    }
    const text = await res.text()
    let json: Record<string, unknown> = {}
    try {
      json = text ? JSON.parse(text) : {}
    } catch {
      json = { message: text.slice(0, 300) }
    }
    if (!res.ok) {
      const msg = (json.message as string) || `HTTP ${res.status}`
      if (res.status === 401) {
        throw new DeployApiError(
          401,
          `Authentication failed (${cred.source}): ${msg}`,
          json
        )
      }
      if (res.status === 404) {
        throw new DeployApiError(
          404,
          `Instance '${instanceName}' not found, or this token cannot access it.`,
          json
        )
      }
      throw new DeployApiError(res.status, msg, json)
    }
    return json as T
  }

  return {
    base,
    headers,
    whoami: () =>
      call<{
        instance: { id: string; subdomain: string }
        via: string
        token: string | null
        scopes: string[]
      }>('GET', '/whoami'),
    check: (files: Record<string, string>, nodeModules = false) =>
      call<{ missing: string[] }>('POST', '/check', { files, nodeModules }),
    upload: (bundle: Buffer) =>
      call<{ received: number; stored: number }>(
        'POST',
        '/blobs',
        undefined,
        bundle
      ),
    commit: (body: Record<string, unknown>) =>
      call<CommitResult>('POST', '/commit', body),
  }
}

/**
 * Deploys over HTTPS: send the manifest, upload only what the server doesn't have, then commit. The server swaps the
 * files in atomically and restarts the instance when hooks, migrations or packages changed.
 */
export const deployViaApi = async (opts: DeployApiOptions) => {
  const log = opts.log ?? console.log
  const cwd = opts.cwd ?? process.cwd()
  const cred = await resolveDeployCredential()
  const client = createDeployClient(opts.instanceName, cred)

  const { files, skipped, nodeModules } = await collectLocalFiles(
    opts.include,
    opts.exclude,
    cwd,
    { nodeModules: opts.nodeModules }
  )
  for (const line of describeNodeModules(nodeModules)) log(line)
  assertNodeModulesComplete(nodeModules)
  if (skipped.length > 0) {
    log(
      `⚠️  Skipping ${skipped.length} file(s) outside the deployable set (pb_* except pb_data, package.json, bun.lock(b), patches/)${opts.verbose ? `: ${skipped.join(', ')}` : ''}`
    )
  }
  const manifest = Object.fromEntries(files.map((f) => [f.path, f.hash]))
  const byHash = new Map(files.map((f) => [f.hash, f]))

  log(
    `🚚 Deploying ${files.length} files to ${opts.instanceName} (token from ${cred.source})`
  )

  let uploadedCount = 0
  let uploadedBytes = 0
  const upload = async (hashes: string[]) => {
    const toSend = [...new Set(hashes)]
      .map((h) => byHash.get(h))
      .filter((f): f is LocalFile => !!f)
    if (toSend.length === 0) return
    const bytes = toSend.reduce((n, f) => n + f.size, 0)
    log(`⬆️  Uploading ${toSend.length} file(s) (${prettyBytes(bytes)})`)
    for (const batch of batchBySize(toSend, UPLOAD_BATCH_BYTES)) {
      const buffers = await Promise.all(batch.map((f) => readFile(f.source)))
      for (let i = 0; i < batch.length; i++) {
        if (sha256(buffers[i]!) !== batch[i]!.hash) {
          throw new Error(
            `${batch[i]!.path} changed during deploy; run it again`
          )
        }
      }
      await client.upload(gzipSync(encodeBundle(buffers)))
      if (opts.verbose) for (const f of batch) log(`   ${f.path}`)
    }
    uploadedCount += toSend.length
    uploadedBytes += bytes
  }

  // Tells the server this deploy owns the root node_modules, so packages that are no longer shipped get removed.
  const managesNodeModules = nodeModules !== null
  const { missing } = await client.check(manifest, managesNodeModules)
  await upload(missing)

  const commitBody = {
    files: manifest,
    nodeModules: managesNodeModules,
    commit: opts.commit ?? detectCommit(cwd),
    message: opts.message ?? '',
    source: detectSource(),
    uploadedCount,
    uploadedBytes,
  }

  let result: CommitResult
  try {
    result = await client.commit(commitBody)
  } catch (e) {
    // Blobs can be garbage-collected by a concurrent deploy between upload and commit; upload again once.
    if (
      e instanceof DeployApiError &&
      e.status === 409 &&
      Array.isArray(e.body.missing)
    ) {
      await upload(e.body.missing as string[])
      result = await client.commit({
        ...commitBody,
        uploadedCount,
        uploadedBytes,
      })
    } else {
      throw e
    }
  }

  if (opts.verbose) {
    for (const p of result.written) log(`   + ${p}`)
    for (const p of result.deleted) log(`   - ${p}`)
  }
  if (result.nothingChanged) {
    log(`✅ ${opts.instanceName} is up to date: no changes.`)
    return result
  }
  const summary = `${result.writtenCount} changed, ${result.deletedCount} deleted, ${result.unchanged} unchanged`
  const restart = result.restarted
    ? ' Instance restarted.'
    : result.startError
      ? ` Instance failed to start: ${result.startError} (check 'pockethost logs').`
      : ''
  log(`🚀 Deployed ${result.deployId}: ${summary}.${restart}`)
  return result
}
