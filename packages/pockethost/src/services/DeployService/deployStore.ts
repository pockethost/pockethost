import { createHash, randomBytes } from 'crypto'
import { createReadStream, existsSync } from 'fs'
import { copyFile, lstat, mkdir, readdir, readFile, rename, rm, rmdir, unlink, writeFile } from 'fs/promises'
import { dirname, join, relative, sep } from 'path'
import { isCodePath, isCodeRoot, NODE_MODULES_DIR, type Manifest } from './codeSet'

/**
 * Per-instance deploy storage on the cell, outside the instance directory (so SFTP never sees it) but on the same
 * filesystem (so staged files can be renamed into place):
 *
 *     <root>/blobs/<aa>/<sha256>      content-addressed file store (kept for history/rollback)
 *     <root>/manifests/<id>.json      manifest of each successful deploy
 *     <root>/tmp/                     staging + backup dirs for an in-flight deploy
 *
 * The root `node_modules` is managed only by deploys whose manifest contains `node_modules/` paths (CLIs that ship the
 * production dependency tree). Other deploys leave it exactly as it is.
 */
export type DeployStore = ReturnType<typeof createDeployStore>

export class MissingBlobsError extends Error {
  constructor(public missing: string[]) {
    super(`${missing.length} file(s) must be uploaded first`)
  }
}

export class DeployConflictError extends Error {}

export const KEEP_MANIFESTS = 10

export const sha256File = (fsPath: string) =>
  new Promise<string>((resolve, reject) => {
    const h = createHash('sha256')
    createReadStream(fsPath)
      .on('error', reject)
      .on('data', (c) => h.update(c))
      .on('end', () => resolve(h.digest('hex')))
  })

const tmpName = (prefix: string) => `${prefix}-${Date.now()}-${randomBytes(4).toString('hex')}`

export type CurrentFile = { fsPath: string; size: number; hash: string }

type HashCacheEntry = { size: number; mtimeMs: number; hash: string }

export type ApplyResult = {
  written: string[]
  deleted: string[]
  unchanged: number
  totalBytes: number
  /** The old root node_modules was moved aside as a whole (it held symlinks or files a deploy can't represent). */
  replacedNodeModules: boolean
}

export type DeployPlan = {
  toWrite: string[]
  toDelete: string[]
  unchanged: number
}

const isNodeModulesPath = (p: string) => p.split('/')[0] === NODE_MODULES_DIR

/** True when this deploy manages the root node_modules (the manifest ships at least one file in it). */
export const managesNodeModules = (manifest: Manifest) => Object.keys(manifest).some(isNodeModulesPath)

export type CurrentScan = {
  /** Code-set files on disk. */
  files: Map<string, CurrentFile>
  /**
   * Set when the deploy manages node_modules and the existing root node_modules can't be diffed file by file (it is a
   * symlink, or holds symlinks, `.git*` entries or special files, e.g. left by `bun install`). The whole folder is then
   * moved to the backup dir and rebuilt from the manifest. `files` still lists its regular files as copy sources.
   */
  replaceNodeModules: boolean
}

/** Pure: what has to change on disk to make `current` match `manifest`. */
export const planDeploy = (manifest: Manifest, current: Map<string, { hash: string }>): DeployPlan => {
  const toWrite: string[] = []
  let unchanged = 0
  for (const [path, hash] of Object.entries(manifest)) {
    if (current.get(path)?.hash === hash) unchanged++
    else toWrite.push(path)
  }
  const toDelete = [...current.keys()].filter((p) => !(p in manifest))
  return { toWrite: toWrite.sort(), toDelete: toDelete.sort(), unchanged }
}

export const createDeployStore = (root: string, instanceDir: string) => {
  const blobsDir = join(root, 'blobs')
  const manifestsDir = join(root, 'manifests')
  const tmpDir = join(root, 'tmp')
  const hashCache = new Map<string, HashCacheEntry>()

  const blobPath = (hash: string) => join(blobsDir, hash.slice(0, 2), hash)
  const hasBlob = (hash: string) => existsSync(blobPath(hash))

  const putBlob = async (hash: string, data: Buffer) => {
    const dest = blobPath(hash)
    if (existsSync(dest)) return false
    await mkdir(dirname(dest), { recursive: true })
    const tmp = `${dest}.${randomBytes(4).toString('hex')}.tmp`
    await writeFile(tmp, data)
    await rename(tmp, dest)
    return true
  }

  /** Copies a file into the blob store if the store doesn't have it (verifying the hash). */
  const ingestFile = async (hash: string, fsPath: string) => {
    if (hasBlob(hash)) return
    const dest = blobPath(hash)
    await mkdir(dirname(dest), { recursive: true })
    const tmp = `${dest}.${randomBytes(4).toString('hex')}.tmp`
    await copyFile(fsPath, tmp)
    if ((await sha256File(tmp)) !== hash) {
      await unlink(tmp).catch(() => {})
      return
    }
    await rename(tmp, dest)
  }

  const hashWithCache = async (fsPath: string, size: number, mtimeMs: number) => {
    const cached = hashCache.get(fsPath)
    if (cached && cached.size === size && cached.mtimeMs === mtimeMs) return cached.hash
    const hash = await sha256File(fsPath)
    hashCache.set(fsPath, { size, mtimeMs, hash })
    return hash
  }

  /**
   * Walks the code set currently in the instance directory. Symlinks in the code set are refused: the deploy API never
   * follows or writes through them. The root node_modules is walked only when `withNodeModules` is set; there, anything
   * a deploy can't represent marks the whole folder for replacement instead of failing (see CurrentScan).
   */
  const scan = async (withNodeModules: boolean): Promise<CurrentScan> => {
    const files = new Map<string, CurrentFile>()
    let replaceNodeModules = false
    if (!existsSync(instanceDir)) return { files, replaceNodeModules }
    const walk = async (dir: string) => {
      for (const name of await readdir(dir)) {
        const fsPath = join(dir, name)
        const rel = relative(instanceDir, fsPath).split(sep).join('/')
        const inNodeModules = isNodeModulesPath(rel)
        if (dir === instanceDir && !isCodeRoot(name) && !(withNodeModules && name === NODE_MODULES_DIR)) continue
        const st = await lstat(fsPath)
        if (inNodeModules) {
          if (st.isFile() && isCodePath(rel)) {
            files.set(rel, { fsPath, size: st.size, hash: await hashWithCache(fsPath, st.size, st.mtimeMs) })
          } else if (st.isDirectory() && isCodePath(`${rel}/x`)) {
            await walk(fsPath)
          } else if (rel === NODE_MODULES_DIR && st.isFile()) {
            // A stray file named node_modules: apply() moves it aside when the first package dir is created.
          } else {
            replaceNodeModules = true
          }
          continue
        }
        if (st.isSymbolicLink()) {
          if (isCodePath(rel)) throw new DeployConflictError(`${rel} is a symlink; remove it over SFTP and redeploy`)
          continue
        }
        if (st.isDirectory()) {
          // .git* dirs (and node_modules outside the root) are never walked into.
          if (isCodePath(`${rel}/x`)) await walk(fsPath)
          continue
        }
        if (!st.isFile() || !isCodePath(rel)) continue
        files.set(rel, { fsPath, size: st.size, hash: await hashWithCache(fsPath, st.size, st.mtimeMs) })
      }
    }
    await walk(instanceDir)
    return { files, replaceNodeModules }
  }

  /** The code-set files on disk that a deploy of `manifest` compares against (node_modules only if it manages it). */
  const scanCurrent = async (manifest: Manifest = {}) => (await scan(managesNodeModules(manifest))).files

  /** Hashes the client is missing: not in the blob store and not anywhere in the current code set. */
  const findMissing = async (manifest: Manifest) => {
    const current = await scanCurrent(manifest)
    const onDisk = new Set([...current.values()].map((f) => f.hash))
    const missing = new Set<string>()
    for (const hash of Object.values(manifest)) {
      if (!onDisk.has(hash) && !hasBlob(hash)) missing.add(hash)
    }
    return [...missing]
  }

  /**
   * Copies every file that must change into a staging dir and verifies its hash. Nothing in the instance dir is
   * touched. Throws MissingBlobsError if a needed file is neither uploaded nor on disk.
   */
  const stage = async (manifest: Manifest) => {
    const { files: onDisk, replaceNodeModules } = await scan(managesNodeModules(manifest))
    // When node_modules is replaced wholesale, every file in it is written fresh and nothing in it is deleted one by one.
    const current = replaceNodeModules ? new Map([...onDisk].filter(([rel]) => !isNodeModulesPath(rel))) : onDisk
    const plan = planDeploy(manifest, current)
    const byHash = new Map<string, string>()
    for (const f of onDisk.values()) byHash.set(f.hash, f.fsPath)

    const stagingDir = join(tmpDir, tmpName('stage'))
    await mkdir(stagingDir, { recursive: true })
    const missing = new Set<string>()
    try {
      for (const path of plan.toWrite) {
        const hash = manifest[path]!
        const src = hasBlob(hash) ? blobPath(hash) : byHash.get(hash)
        if (!src) {
          missing.add(hash)
          continue
        }
        const dest = join(stagingDir, path)
        await mkdir(dirname(dest), { recursive: true })
        await copyFile(src, dest)
        if ((await sha256File(dest)) !== hash) missing.add(hash)
      }
      if (missing.size > 0) throw new MissingBlobsError([...missing])
    } catch (e) {
      await rm(stagingDir, { recursive: true, force: true })
      throw e
    }
    return { plan, stagingDir, current, replaceNodeModules }
  }

  /**
   * Renames staged files into the instance dir and moves stale files out. Every displaced file goes to a backup dir
   * first, so any failure is rolled back. Call this while the instance is stopped: it takes milliseconds, and
   * PocketBase never sees a half-applied file set.
   */
  const apply = async (manifest: Manifest, staged: Awaited<ReturnType<typeof stage>>): Promise<ApplyResult> => {
    const { plan, stagingDir, replaceNodeModules } = staged
    const backupDir = join(tmpDir, tmpName('backup'))
    const undo: (() => Promise<void>)[] = []

    const moveToBackup = async (rel: string) => {
      const from = join(instanceDir, rel)
      const to = join(backupDir, rel)
      await mkdir(dirname(to), { recursive: true })
      await rename(from, to)
      undo.push(async () => {
        await mkdir(dirname(from), { recursive: true })
        await rename(to, from)
      })
    }

    /** Makes sure every parent of `rel` is a real directory inside the instance dir. */
    const ensureParents = async (rel: string) => {
      const segs = rel.split('/').slice(0, -1)
      for (let i = 1; i <= segs.length; i++) {
        const dirRel = segs.slice(0, i).join('/')
        const fsPath = join(instanceDir, dirRel)
        const st = await lstat(fsPath).catch(() => null)
        if (!st) {
          await mkdir(fsPath)
          undo.push(() => rmdir(fsPath).catch(() => {}))
          continue
        }
        if (st.isSymbolicLink()) throw new DeployConflictError(`${dirRel} is a symlink`)
        if (st.isDirectory()) continue
        // A file where a directory needs to be. It's stale (validateManifest forbids file+dir), so back it up.
        await moveToBackup(dirRel)
        await mkdir(fsPath)
        undo.push(() => rmdir(fsPath).catch(() => {}))
      }
    }

    const pruneEmptyDirs = async (rels: string[]) => {
      const dirs = new Set<string>()
      for (const rel of rels) {
        const segs = rel.split('/')
        // Never remove a top-level dir (pb_hooks etc.); PocketBase and SFTP expect them.
        for (let i = segs.length - 1; i >= 2; i--) dirs.add(segs.slice(0, i).join('/'))
      }
      const deepestFirst = [...dirs].sort((a, b) => b.split('/').length - a.split('/').length)
      for (const d of deepestFirst) {
        const fsPath = join(instanceDir, d)
        try {
          await rmdir(fsPath)
          undo.push(() => mkdir(fsPath, { recursive: true }).then(() => {}))
        } catch {
          // not empty or already gone
        }
      }
    }

    try {
      await mkdir(instanceDir, { recursive: true })
      // The old node_modules goes to the backup dir in one rename; undo renames it back.
      if (replaceNodeModules) await moveToBackup(NODE_MODULES_DIR)
      for (const rel of plan.toDelete) await moveToBackup(rel)
      await pruneEmptyDirs(plan.toDelete)

      for (const rel of plan.toWrite) {
        await ensureParents(rel)
        const dest = join(instanceDir, rel)
        const st = await lstat(dest).catch(() => null)
        if (st?.isDirectory()) {
          throw new DeployConflictError(`${rel} is a directory on the server with files the deploy can't remove`)
        }
        if (st) await moveToBackup(rel)
        await rename(join(stagingDir, rel), dest)
        undo.push(() => rename(dest, join(stagingDir, rel)))
      }
    } catch (e) {
      for (const step of undo.reverse()) {
        await step().catch(() => {})
      }
      await rm(backupDir, { recursive: true, force: true })
      await rm(stagingDir, { recursive: true, force: true })
      throw e
    }

    await rm(backupDir, { recursive: true, force: true })
    await rm(stagingDir, { recursive: true, force: true })

    let totalBytes = 0
    for (const rel of Object.keys(manifest)) {
      const st = await lstat(join(instanceDir, rel)).catch(() => null)
      totalBytes += st?.size ?? 0
    }

    return {
      written: plan.toWrite,
      deleted: plan.toDelete,
      unchanged: plan.unchanged,
      totalBytes,
      replacedNodeModules: replaceNodeModules,
    }
  }

  /** Keeps a copy of every deployed file in the blob store and records the manifest for history/rollback. */
  const recordManifest = async (deployId: string, manifest: Manifest) => {
    for (const [rel, hash] of Object.entries(manifest)) {
      await ingestFile(hash, join(instanceDir, rel)).catch(() => {})
    }
    await mkdir(manifestsDir, { recursive: true })
    await writeFile(join(manifestsDir, `${deployId}.json`), JSON.stringify({ deployId, at: Date.now(), manifest }))
  }

  /** Drops old manifests and any blob no remaining manifest references. */
  const gc = async (keep = KEEP_MANIFESTS) => {
    if (!existsSync(manifestsDir)) return { removedBlobs: 0 }
    const entries = await Promise.all(
      (await readdir(manifestsDir))
        .filter((f) => f.endsWith('.json'))
        .map(async (f) => {
          const doc = JSON.parse(await readFile(join(manifestsDir, f), 'utf8')) as { at: number; manifest: Manifest }
          return { f, ...doc }
        })
    )
    entries.sort((a, b) => b.at - a.at)
    const kept = entries.slice(0, keep)
    for (const old of entries.slice(keep)) await unlink(join(manifestsDir, old.f)).catch(() => {})
    const live = new Set(kept.flatMap((e) => Object.values(e.manifest)))
    let removedBlobs = 0
    if (!existsSync(blobsDir)) return { removedBlobs }
    for (const prefix of await readdir(blobsDir)) {
      for (const name of await readdir(join(blobsDir, prefix))) {
        if (name.endsWith('.tmp') || !live.has(name)) {
          await unlink(join(blobsDir, prefix, name)).catch(() => {})
          removedBlobs++
        }
      }
    }
    return { removedBlobs }
  }

  /** Removes staging/backup dirs left by a crash. Safe only when no deploy is in flight for this instance. */
  const cleanTmp = () => rm(tmpDir, { recursive: true, force: true })

  return {
    instanceDir,
    blobPath,
    hasBlob,
    putBlob,
    scanCurrent,
    findMissing,
    stage,
    apply,
    recordManifest,
    gc,
    cleanTmp,
  }
}
